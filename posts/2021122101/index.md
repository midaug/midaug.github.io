# Nginx 内容缓存及常见参数配置


## 场景

> 使用场景:项目的页面需要加载很多数据，也不是经常变化的，不涉及个性化定制，为每次请求去动态生成数据，性能比不上根据请求路由和参数缓存一下结果，使用 Nginx 缓存将大幅度提升请求速度。

### 基础[](#基础)

只需要配置 `proxy_cache_path` 和 `proxy_cache` 就可以开启内容缓存，前者用来设置缓存的路径和配置，后者用来启用缓存。

```
http {
    ...
    proxy_cache_path /path/to/cache levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;

    server {
        proxy_cache mycache;
        location / {
            proxy_pass http://localhost:8000;
        }
    }
} 
```

**对应参数说明:**
> 1.用于缓存的本地磁盘目录是 /path/to/cache/

> 2.levels 在 /path/to/cache/ 设置了一个两级层次结构的目录。将大量的文件放置在单个目录中会导致文件访问缓慢，所以针对大多数部署，我们推荐使用两级目录层次结构。如果 levels 参数没有配置，则 NGINX 会将所有的文件放到同一个目录中。

> 3.keys_zone 设置一个共享内存区，该内存区用于存储缓存键和元数据，有些类似计时器的用途。将键的拷贝放入内存可以使 NGINX 在不检索磁盘的情况下快速决定一个请求是 `HIT` 还是 `MISS`，这样大大提高了检索速度。一个 1MB 的内存空间可以存储大约 8000 个 key，那么上面配置的 10MB 内存空间可以存储差不多 80000 个key。

> 4.max_size 设置了缓存的上限（在上面的例子中是 10G）。这是一个可选项；如果不指定具体值，那就是允许缓存不断增长，占用所有可用的磁盘空间。当缓存达到这个上线，处理器便调用 cache manager 来移除最近最少被使用的文件，这样把缓存的空间降低至这个限制之下。

> 5.inactive 指定了项目在不被访问的情况下能够在内存中保持的时间。在上面的例子中，如果一个文件在 60 分钟之内没有被请求，则缓存管理将会自动将其在内存中删除，不管该文件是否过期。该参数默认值为 10 分钟（10m）。注意，非活动内容有别于过期内容。NGINX 不会自动删除由缓存控制头部指定的过期内容（本例中Cache-Control:max-age=120）。过期内容只有在 inactive 指定时间内没有被访问的情况下才会被删除。如果过期内容被访问了，那么 NGINX 就会将其从原服务器上刷新，并更新对应的 inactive 计时器。

> 6.NGINX 最初会将注定写入缓存的文件先放入一个临时存储区域， use\_temp\_path=off 命令指示 NGINX 将在缓存这些文件时将它们写入同一个目录下。我们强烈建议你将参数设置为 off 来避免在文件系统中不必要的数据拷贝。use\_temp\_path 在 NGINX1.7 版本和 NGINX Plus R6 中有所介绍。

> 最终，proxy_cache 命令启动缓存那些 URL 与 location 部分匹配的内容（本例中，为`/`）。你同样可以将 proxy\_cache 命令添加到 server 部分，这将会将缓存应用到所有的那些 location 中未指定自己的 proxy\_cache 命令的服务中。

### Nginx 缓存相关进程[](#nginx-缓存相关进程)

缓存中还涉及两个额外的NGINX进程：

- **cache manager** 周期性地启动，检查高速缓存的状态。如果高速缓存大小超过 proxy\_cache\_path 中 max_size 参数设置的限制，则高速缓存管理器将删除最近访问过的数据。在两次缓存管理器启动的间隔，缓存的数据量可能短暂超过配置的大小。
- **cache loader** 只运行一次，NGINX 开始之后。它将有关以前缓存的数据的元数据加载到共享内存区域。一次加载整个缓存可能会消耗足够的资源来在启动后的最初几分钟内降低 NGINX 的性能。要避免这种情况，请通过在 proxy\_cache\_path 指令中包含以下参数来配置缓存的迭代加载：
    - loader_threshold - 迭代持续时间，以毫秒为单位（默认情况下 200）
    - loader_files - 一次迭代期间加载的最大项目数（默认情况下 100）
    - loader_sleeps - 迭代之间的延迟，以毫秒为单位（默认情况下 50）

在以下示例中，迭代持续数300 毫秒或直到 200 个项目被加载进去：

```
proxy_cache_path /data/nginx/cache keys_zone=one:10m loader_threshold=300 loader_files=200; 
```

### 其他常用参数[](#其他常用参数)

**配置示例：**

```
proxy_cache_path /path/to/cache levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;

server {
    ...
    location / {
        proxy_cache my_cache;
        # proxy_cache_key "$host$request_uri$cookie_user";
        proxy_cache_min_uses 3;
        proxy_cache_methods GET HEAD POST;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404      1m;
        # proxy_cache_valid any 5m;
        proxy_pass http://localhost:8000;
    }
} 
```

**对应参数说明：**
`proxy_cache_key` 为更改计算密钥时使用的请求特征，指定缓存的 key，这个不推荐，示例是使用域名，请求url，用户 cookie 来当作 key，意味着一个页面将为不同的用户缓存 n 次，绝大多数情况不需要这样的操作。
`proxy_cache_min_uses` 为在缓存响应之前必须使用相同密钥的请求的最小次数。
`proxy_cache_methods` 为指定要被缓存的请求方式的响应值，默认为 GET 和 HEAD，新增其他的需要一起列出来，如上示例所示。
`proxy_cache_valid` 为响应状态码的缓存时间，示例可以为每个状态码缓存指定时间，也可以使用 any 进行全部状态码的缓存。

### 清除缓存[](#清除缓存)

需要提前加一个配置，用于标识使用 HTTP PURGE 方法的请求并删除匹配的 URL 对应的缓存。
1.在 `http {}` 上下文中创建新变量，例如 `$purge_method`, 他依赖于 `$request_method` 变量：

```
http {
    ...
    map $request_method $purge_method {
        PURGE 1;
        default 0;
    }
} 
```

2.在 `location {}` 块中，已经配置缓存的前提下，引入 `proxy_cache_purge` 参数来指定清除缓存请求的条件。例如在上一步指定的 `$request_method`

```
server {
    listen      80;
    server_name www.example.com;

    location / {
        proxy_pass  https://localhost:8002;
        proxy_cache mycache;

        proxy_cache_purge $purge_method;
    }
} 
```

配置完并使之生效之后，就可以发送一条 purge 请求来让缓存失效了，例如：

```
curl -X PURGE -D – "https://www.example.com/*" 
```

在该示例中，将清除具有公共 URL 部分（由星号通配符指定）的资源。但这些缓存条目不会从缓存中完全删除：它们会保留在磁盘上，直到它们被视为不活动（由`proxy_cache_path` 中的 `inactive`参数决定）的时候才完全删除，或缓存清除器（由 `proxy_cache_path` 中的 `purge` 决定），或客户端尝试访问它们的时候。


## Nginx 基于url参数的反向代理加缓存实践
**nginx.conf：**
```
user nginx;
worker_processes auto;

error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;


events {
    worker_connections 1024;
}


http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
    '$status $body_bytes_sent "$http_referer" '
    '"$http_user_agent" "$http_x_forwarded_for"';

    # access_log /var/log/nginx/access.log main;

    sendfile on;
    #tcp_nopush     on;

    keepalive_timeout 65;

    # 配置多个proxy_cache_path以便实现不同的业务
    proxy_connect_timeout 10;
    proxy_read_timeout 180;
    proxy_send_timeout 5;
    proxy_buffer_size 16k;
    proxy_buffers 4 32k;
    proxy_busy_buffers_size 96k;
    proxy_temp_file_write_size 96k;
    proxy_temp_path /tmp/nginx/temp_dir;
    proxy_cache_path /tmp/nginx/cache1m levels=1:2 keys_zone=cache1m:100m inactive=1m max_size=10g;
    proxy_cache_path /tmp/nginx/cache5m levels=1:2 keys_zone=cache5m:100m inactive=5m max_size=10g;
    proxy_cache_path /tmp/nginx/cache10m levels=1:2 keys_zone=cache10m:100m inactive=10m max_size=10g;
    proxy_cache_path /tmp/nginx/cache30m levels=1:2 keys_zone=cache30m:100m inactive=30m max_size=10g;
    proxy_cache_path /tmp/nginx/cache1h levels=1:2 keys_zone=cache1h:100m inactive=1h max_size=10g;
    proxy_cache_path /tmp/nginx/cache12h levels=1:2 keys_zone=cache12h:100m inactive=12h max_size=10g;
    proxy_cache_path /tmp/nginx/cache1d levels=1:2 keys_zone=cache1d:100m inactive=1d max_size=10g;
    proxy_cache_path /tmp/nginx/cache7d levels=1:2 keys_zone=cache7d:100m inactive=7d max_size=10g;
    proxy_cache_path /tmp/nginx/cache30d levels=1:2 keys_zone=cache30d:100m inactive=30d max_size=10g;


    server {
        listen 80;
        server_name .*;

        location / {
            root html;
            index index.html index.htm;
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root html;
        }

        location /_proxy/ {
            # 跨域支持
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET,POST,OPTIONS,PUT,DELETE' always;
                add_header 'Access-Control-Allow-Headers' '*' always;
                add_header 'Access-Control-Max-Age' 1728000 always;
                add_header 'Content-Length' 0;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                return 204;
            }

            if ($request_method ~* '(GET|POST|DELETE|PUT)') {
                add_header 'Access-Control-Allow-Origin' '*' always;
            }

            # 解析缓存域
            set $proxy_cache "cache1m";
            if ( $request_uri ~ "/_proxy/(.+)\?" ) {
                set $proxy_cache $1;
            }
            # 不存在的缓存域时返回404异常
            if (!-e /tmp/nginx/$proxy_cache) {
                add_header proxy_cache_time 'cache dir is not found';
                return 404;
            }
            # 缓存配置
            proxy_cache $proxy_cache;
            # proxy_cache_valid 200 302 24h;
            # proxy_cache_valid 301 30d;
            proxy_cache_valid any 30d;
            expires 30d;
            # 增加响应头记录是否命中缓存
            add_header proxy_cache_time $proxy_cache;
            add_header proxy_cache_status $upstream_cache_status;
            # 关闭重定向
            proxy_redirect off;
            # 能解析转发 URL 的 DNS
            resolver 223.5.5.5 8.8.8.8;
            # 获取真实url
            if ($query_string ~ "^url=(.+)") {
                set $proxy_url $1;
            }
            # 获取 host
            set $proxy_host $host;
            if ($proxy_url ~ "https?://(.*?)/") {
                set $proxy_host $1;
            }
            proxy_set_header Host $proxy_host;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_pass $proxy_url;
        }

    }

}
```

**docker-compose.yml 快速测试：**
```
version: "3.6"
services:
  nginx-cache:
    image: nginx:1.20.2-alpine
    container_name: nginx-cache
    restart: always
    network_mode: bridge
    ports:
    - "8000:80"
    environment:
    - TZ=Asia/Shanghai
    volumes:  
    - "./nginx.conf:/etc/nginx/nginx.conf:ro"
    - "./logs:/var/log/nginx:rw"
    - "./temp:/tmp/nginx"
```


参考链接：

1.  [Nginx 缓存使用官方指南](https://giphy.com/search/Tom-and-Jerry?utm_source=wechat_session&utm_medium=social&from=singlemessage)
2.  [Nginx 内容缓存文档](https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/)

