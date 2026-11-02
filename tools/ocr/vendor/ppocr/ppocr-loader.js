/* PP-OCR 引擎共享加载器 — ocr 与 ssq 两页共用（本文件位于 ocr/vendor/ppocr/ 下）。

   降级顺序（用户 2026-11-02 指定）：npmmirror → unpkg → 本地服务器
     ① npmmirror（阿里云，实测 27MB/s）
          wasm：files 单文件接口（该包在白名单内，14.5MB）
          模型：npm tarball（14.9MB）→ 浏览器内 gunzip + 解 tar → blob URL
     ② unpkg.com（境外，单文件，CORS *）
     ③ 本地 ../ort/ 与同目录 vendor 文件（永不失败）
   （腾讯云镜像也验证过可用，但它只有 registry 接口、取 wasm 要整包下 34.6MB，按用户要求去掉。）
   guten-ocr.js（10MB 自定义 bundle）与 glue mjs（24KB）：始终本地。
   为什么模型走 tarball：npmmirror 的 files 接口是**白名单制**（cnpm/unpkg-white-list），
   onnxruntime-web 在内，@gutenye/ocr-models 不在（403）；而 tarball 接口对所有包开放且带 CORS，
   故用 DecompressionStream + 极简 tar 解析取出三个文件，生成 blob URL 交给引擎
   （引擎与 ORT 都只把 path 当 URL 去 fetch，blob: 同样可 fetch）。
   注意：npmmirror 的 CORS 头**只在 GET 上返回**（HEAD 不返回），探测/下载一律用 GET
   （探测用 Range: bytes=0-0），不能拿 HEAD 判断可用性——踩过这个坑。

   升级注意：
     - CDN 的 ort 版本(1.31.1)必须与本地 ort.min.js 的版本严格一致（JS 与 wasm 不匹配会崩）
     - CDN 的模型版本(1.4.2)必须与本地 onnx 同源（npm @gutenye/ocr-models 的 assets）
   依赖页面 <script type="importmap">：onnxruntime-web / onnxruntime-common → ort.min.js
   （本加载器与 guten-ocr.js 的外部 import 共享同一 ORT 模块实例，env 设置才能生效）。 */

const ORT_VER = '1.31.1';
const MODELS_VER = '1.4.2';
const ORT_PKG = 'onnxruntime-web@' + ORT_VER;
const MODELS_PKG = '@gutenye/ocr-models@' + MODELS_VER;
const WASM_REL = ORT_PKG + '/dist/ort-wasm-simd-threaded.wasm';
const MODEL_RELS = {
  det: MODELS_PKG + '/assets/ch_PP-OCRv4_det_infer.onnx',
  rec: MODELS_PKG + '/assets/ch_PP-OCRv4_rec_infer.onnx',
  dict: MODELS_PKG + '/assets/ppocr_keys_v1.txt'
};

/* ① npmmirror：单文件接口（wasm）+ 通用 tarball 接口（模型） */
const NP_WASM = 'https://registry.npmmirror.com/onnxruntime-web/' + ORT_VER +
  '/files/dist/ort-wasm-simd-threaded.wasm';
const NP_MODELS_TGZ = 'https://registry.npmmirror.com/@gutenye/ocr-models/-/ocr-models-' + MODELS_VER + '.tgz';

/* ② unpkg（单文件） */
const UNPKG = 'https://unpkg.com';

/* 自有源可覆盖，排最前优先（页面在 import 之前设置，目录结构同 npm 包路径）：
   window.__PPOCR_CDN__ = ['https://your-oss.example.com/ppocr'] */
const USER_BASES = (typeof window !== 'undefined' && Array.isArray(window.__PPOCR_CDN__))
  ? window.__PPOCR_CDN__.filter(function (b) { return typeof b === 'string' && b; })
  : [];

const here = new URL('.', import.meta.url);          /* .../vendor/ppocr/ */
const ortDir = new URL('../ort/', here);             /* .../vendor/ort/  */

const LOCAL = {
  wasm: new URL('ort-wasm-simd-threaded.wasm', ortDir).href,
  models: {
    detectionPath: new URL('ch_PP-OCRv4_det_infer.onnx', here).href,
    recognitionPath: new URL('ch_PP-OCRv4_rec_infer.onnx', here).href,
    dictionaryPath: new URL('ppocr_keys_v1.txt', here).href
  }
};

const MIN = { wasm: 1 << 20, det: 1 << 20, rec: 1 << 20, dict: 1 << 12 };   /* 截断/错误页检测 */

function join(base, rel) { return base.replace(/\/+$/, '') + '/' + rel; }

/* GET 探测（npmmirror 的 CORS 只在 GET 返回，HEAD 会误判为不可用） */
async function getCost(url, timeoutMs) {
  const t0 = performance.now();
  try {
    const r = await fetch(url, {
      headers: { Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    return r.ok ? performance.now() - t0 : Infinity;
  } catch (e) { return Infinity; }
}

async function fetchBytes(url, timeoutMs) {
  const opt = {};
  if (timeoutMs) opt.signal = AbortSignal.timeout(timeoutMs);   /* 本地兜底不设超时 */
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.arrayBuffer();
}

/* ---- tarball → 三个模型文件 ----------------------------------------- */
const MODEL_MEMBERS = {
  'package/assets/ch_PP-OCRv4_det_infer.onnx': 'det',
  'package/assets/ch_PP-OCRv4_rec_infer.onnx': 'rec',
  'package/assets/ppocr_keys_v1.txt': 'dict'
};

/* 极简 tar 解析：顺序读 512 字节头，按 size 跳过数据块。pax 扩展头（typeflag x/g）
   也按普通成员跳过，不影响正确性。 */
function extractTar(buf, map) {
  const dec = new TextDecoder();
  const out = {};
  let off = 0;
  while (off + 512 <= buf.length) {
    const name = dec.decode(buf.subarray(off, off + 100)).replace(/\0[\s\S]*$/, '');
    if (!name) break;                                        /* 全零块 = 归档结束 */
    const sizeTxt = dec.decode(buf.subarray(off + 124, off + 136)).replace(/\0[\s\S]*$/, '').trim();
    const size = parseInt(sizeTxt, 8) || 0;
    const start = off + 512;
    const key = map[name];
    if (key) out[key] = buf.subarray(start, start + size);
    off = start + Math.ceil(size / 512) * 512;
  }
  return out;
}

async function fetchTar(url, map, timeoutMs) {
  if (typeof DecompressionStream === 'undefined') throw new Error('浏览器不支持 DecompressionStream');
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (!r.body) throw new Error('无响应流');
  const raw = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const f = extractTar(new Uint8Array(raw), map);
  const keys = Object.keys(map).map(function (k) { return map[k]; });
  for (let i = 0; i < keys.length; i++) {
    if (!f[keys[i]]) throw new Error('tar 内缺少 ' + keys[i]);
    if (f[keys[i]].length < MIN[keys[i]]) throw new Error(keys[i] + ' 字节数异常');
  }
  return f;
}

function blobUrl(bytes, type) {
  return URL.createObjectURL(new Blob([bytes], { type: type }));
}

let apiPromise = null;

export function init() {
  if (!apiPromise) apiPromise = load().catch(function (e) { apiPromise = null; throw e; });
  return apiPromise;
}

async function load() {
  const t0 = performance.now();
  const ort = await import('onnxruntime-web');       /* 走页面 import map */
  const mod = await import(new URL('./guten-ocr.js', here).href);   /* 10MB，始终本地 */
  const Ocr = mod.default;

  try {
    return await build(Ocr, ort, t0);
  } catch (e) {
    console.warn('CDN 资源加载后引擎创建失败（' + (e && (e.message || e)) + '），整体改用本地资源重试');
    return await build(Ocr, ort, t0, true);
  }
}

/* ---- ①→②→③ 顺序取 wasm --------------------------------------------- */
async function acquireWasm() {
  /* 自有源（若页面配置了，最优先） */
  for (let i = 0; i < USER_BASES.length; i++) {
    const b = USER_BASES[i];
    try {
      const buf = await fetchBytes(join(b, WASM_REL), 30000);
      if (buf.byteLength < MIN.wasm) throw new Error('字节数异常 ' + buf.byteLength);
      return { buf: buf, src: 'cdn', host: new URL(b).host };
    } catch (e) {
      console.warn('自有 wasm 源失败（' + new URL(b).host + '）：' + (e && (e.message || e)));
    }
  }

  /* ① npmmirror 单文件 */
  try {
    const buf = await fetchBytes(NP_WASM, 60000);
    if (buf.byteLength < MIN.wasm) throw new Error('字节数异常 ' + buf.byteLength);
    return { buf: buf, src: 'cdn', host: 'npmmirror' };
  } catch (e) {
    console.warn('npmmirror wasm 失败：' + (e && (e.message || e)) + '，按顺序试 unpkg');
  }

  /* ② unpkg 单文件 */
  try {
    const buf = await fetchBytes(join(UNPKG, WASM_REL), 60000);
    if (buf.byteLength < MIN.wasm) throw new Error('字节数异常 ' + buf.byteLength);
    return { buf: buf, src: 'cdn', host: 'unpkg.com' };
  } catch (e) {
    console.warn('unpkg wasm 失败：' + (e && (e.message || e)));
  }

  /* ③ 本地 */
  console.warn('全部 CDN 不可用，wasm 回退本地');
  return { buf: await fetchBytes(LOCAL.wasm), src: 'local', host: '' };
}

/* ---- 同一顺序取模型 -------------------------------------------------- */
async function acquireModels() {
  /* ① npmmirror tarball */
  try {
    const f = await fetchTar(NP_MODELS_TGZ, MODEL_MEMBERS, 60000);
    return { models: modelsFromTar(f), src: 'cdn', host: 'npmmirror' };
  } catch (e) {
    console.warn('npmmirror 模型包失败：' + (e && (e.message || e)) + '，按顺序试 unpkg');
  }

  /* ② unpkg 单文件：先探 det 再交付，避免白建会话 */
  const detUrl = join(UNPKG, MODEL_RELS.det);
  if (isFinite(await getCost(detUrl, 5000))) {
    return {
      models: {
        detectionPath: detUrl,
        recognitionPath: join(UNPKG, MODEL_RELS.rec),
        dictionaryPath: join(UNPKG, MODEL_RELS.dict)
      },
      src: 'cdn', host: 'unpkg.com'
    };
  }
  console.warn('unpkg 模型不可用');

  /* ③ 本地 */
  return { models: LOCAL.models, src: 'local', host: '' };
}

function modelsFromTar(f) {
  return {
    detectionPath: blobUrl(f.det, 'application/octet-stream'),
    recognitionPath: blobUrl(f.rec, 'application/octet-stream'),
    dictionaryPath: blobUrl(f.dict, 'text/plain')
  };
}

/* 线程数：ORT 只在 crossOriginIsolated（需 COOP+COEP 响应头）成立时才会真正开线程，
   否则内部把 numThreads 静默改成 1（不报错，只是慢）。`?threads=N` 用于真机 A/B，
   不写则沿用 ORT 默认（隔离态下 = min(4, ceil(核数/2))）。 */
function wantedThreads() {
  try {
    const m = /[?&]threads=(\d{1,2})(&|$)/.exec(location.search);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return (n >= 1 && n <= 8) ? n : null;
  } catch (e) { return null; }
}

async function build(Ocr, ort, t0, forceLocal) {
  const want = wantedThreads();
  if (want) ort.env.wasm.numThreads = want;      /* 必须在首次 initializeWebAssembly 之前 */
  const isolated = (typeof self !== 'undefined' && self.crossOriginIsolated === true);
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 1;
  if (want > 1 && !isolated) {
    console.warn('请求 ' + want + ' 线程但页面未处于跨源隔离态（缺 COOP/COEP 头），将回落到单线程');
  }

  const w = forceLocal
    ? { buf: await fetchBytes(LOCAL.wasm), src: 'local', host: '' }
    : await acquireWasm();
  ort.env.wasm.wasmBinary = w.buf;
  ort.env.wasm.wasmPaths = { mjs: new URL('ort-wasm-simd-threaded.js', ortDir).href };

  /* wasm 都走本地了说明 CDN 整体不可信，模型不再单独去试 */
  const m = (forceLocal || w.src === 'local')
    ? { models: LOCAL.models, src: 'local', host: '' }
    : await acquireModels();

  const ocr = await Ocr.create({ models: m.models });
  const src = w.src === m.src ? w.src : 'mixed';
  const host = w.host === m.host ? w.host : [w.host, m.host].filter(Boolean).join('+');
  /* ORT 在初始化时可能已经把 numThreads 改写回 1，这里读的是**生效值** */
  const threads = (ort.env && ort.env.wasm && ort.env.wasm.numThreads) || 1;
  console.log('PP-OCR 资源来源: wasm=' + w.src + ' models=' + m.src + (host ? ' host=' + host : ''));
  console.log('ORT 线程: 生效 ' + threads +
    ' / 请求 ' + (want || '默认') +
    ' / 核数 ' + cores +
    ' / 跨源隔离 ' + (isolated ? '是' : '否'));
  return {
    initMs: Math.round(performance.now() - t0),
    src: src,
    threads: threads,
    cores: cores,
    isolated: isolated,
    detect: function (imageData) { return ocr.detect(imageData); }
  };
}
