# java调用phantomjs爬取网页及快照


![phantomjs-png](/images/post/phantomjs.png)
<!-- more -->

# 前言
前阵子遇到一个需求，需要爬取学信网学历的查询结果进行解析并截图留证，利用java完成了爬取的html解析功能后发现截图较为困难。我偶然发现了 phantomjs，可以由服务端去做类似爬虫的操作来爬取html和保存图片，正好满足上述两个需求。

# phantomjs
[官方网站: phantomjs.org](http://phantomjs.org)
phantomjs 是 一个基于 webkit 内核的无头浏览器，没有 UI 界面。它就是一个浏览器，只是内部的点击、翻页等人为相关操作需要程序设计实现。

提供了 javascript API 接口，可以通过 js 直接与 webkit 内核交互，在此之上可以结合 Java 语言等，通过 Java 调用 js 等相关操作，从而解决了以前 c/c++ 才能比较好的基于 webkit 开发优质采集器的限制。

提供了 windows、linux、mac 等不同 OS 的安装使用包，也就是说可以在不同平台上，二次开发采集项目（爬虫）或是自动项目测试等工作。

## 常用内置对象
```javascript
// 获得系统操作对象，包括命令行参数、phantomjs系统设置等信息
var system = require('system');
// 获取操作dom或web网页的对象，通过它可以打开网页、接收网页内容、request、response参数，其为最核心对象。
var page = require('webpage');
// 获取文件系统对象，通过它可以操作操作系统的文件操作，包括read、write、move、copy、delete等。
var fs = require('fs');
```

## 常用API
```javascript
// 通过page对象通过url链接打开页面，加载完成后回调
page.open(url, function (status) {}
// 当page.open调用时，会首先执行该函数，在此可以预置一些参数或函数，用于后边的回调函数中
page.onLoadStarted = function() {}
// page的所要加载的资源在加载过程中，失败回调处理
page.onResourceError = function(resourceError) {}
// page的所要加载的资源在发起请求时，可以回调该函数
page.onResourceRequested = function(requestData, networkRequest) {}
// page的所要加载的资源在加载过程中，每加载一个相关资源，都会在此先做出响应，
// 它相当于http头部分，核心回调对象为response，可以获取本次请求的cookies、userAgent等
page.onResourceReceived = function(response) {}
// 打印一些输出信息到控制台
page.onConsoleMessage = function (msg) {}
// alert也是无法直接弹出的，但可以回调alert的内容
page.onAlert = function(msg) {}
// 当page.open时，http请求（不包括所引起的其它的加载资源）出现了异常，
// 如404、no route to web site等，都会在此回调显示。
page.onError = function(msg, trace) {}
// 当page.open打开的url，或者是在打开过程中进行了跳转，可以在这个函数中回调。
page.onUrlChanged = function(targetUrl) {}
// 当page.open的目标URL被真正打开后，会在调用open的回调函数前调用该函数，在此可以进行内部的翻页等操作
page.onLoadFinished = function(status) {}
// 在所加载的web page内部执行该函数，像翻页、点击、滑动等，均可在此中执行
page.evaluate(function(){});
// 将当前page的现状渲染成图片，输出到指定的文件中去。
page.render("");
```

## 调用方式
```shell
$ /bin/phantomjs [配置文件(js文件)] [参数1] [参数2] [参数3] ...
```
# 实现
java使用java.lang.Runtime调用，接收返回结果进行操作

## config.js 配置文件内容
```javascript
var page = require('webpage').create();
var system = require('system');
var ssionid = system.args[1]; 
var address = system.args[2]; // 请求地址，url
var output = system.args[3]; // 输出
var pageWidth = 1366; //初始化游览器宽
var pageHeight = 1080; //初始化游览器高
page.viewportSize = { width: pageWidth, height: pageHeight }; //初始化游览器

// 添加ssionid至cookie
phantom.addCookie({
  'name'     : 'JSESSIONID',  
  'value'    : ssionid,  
  'domain'   : 'job.chsi.com.cn',
  'path'     : '/'
});
//打开地址
page.open(address, function (status) {
    // 打开完毕
    if (status === "success") {
      // dom操作
        var rect = page.evaluate(function () {
            var html = document.getElementsByTagName('html');
            if(html && html.length > 0){
                if(html[0].innerHTML.indexOf('id="contMain"') < 0){
                    return null;
                }
                return {
                    offset : html[0].getBoundingClientRect(),
                    innerHTML :  html[0].innerHTML   
                };
            }
            return null;
        });
        if(!rect){
            console.log(output);
            page.close();
            phantom.exit();
            return;
        }
        console.log(rect.innerHTML); // 输出html
        page.clipRect = { //设置截取区域(此设置为全屏)
          top:0,
          left:0,
          width:rect.offset.width,
          height:rect.offset.height
        };
        window.setTimeout(function () {
          page.render(output); // 输出
          page.close(); // 关闭
          phantom.exit(); // 退出
        }, 200); 
    }
});
```
### 配置文件总结
- output为输出方式， 为输出的绝对路径(例如:'c:/123.jpg')， 以后缀决定文件格式. 建议使用pdf格式， pdf格式目前测试来看没有出现问题， 图片则出现过背景颜色丢失的情况
- console.log(page.renderBase64('JPEG')) 以Base64的格式输出至控制台
- 这里是因为同时进行html爬取和截图快照， 所以不使用Base64的方式， 且输出的字符串有长度限制， 建议不要大量console.log()， 否则后面的内容可能会缺失
- page.evaluate内可进行dom操作， 这里只取了html， 同理可有规则的针对爬取想要的页面信息
- addCookie会返回一个boolean值， 有见到别人的文章判断了这个值才进行后续操作，  但我测试来看是有bug的， 即使成功也返回了false
- 可以利用dom操作获取元素的位置及宽高对clipRect进行设置， 可达对想要的区域截图的目的， 例如截取某个div中的内容

## java封装
```java
public String phantomjs(String confPath, String url, String ssionId, String outPath) {
  StringBuilder sb = new StringBuilder();
  InputStream is = null;
  InputStreamReader isr = null;
  BufferedReader br = null;
  try {
    String cmd = "phantomjs " + confPath + " " + ssionId + " " + url + " " + outPath;
    Process ps = Runtime.getRuntime().exec(cmd);
    is = ps.getInputStream();
    isr = new InputStreamReader(is, "utf-8"); // 注意编码格式
    br = new BufferedReader(isr);
    String tmp;
    while ((tmp = br.readLine()) != null) {
      sb.append(tmp);
    }
  } catch (IOException e) {
    e.printStackTrace();
  } catch (Exception e) {
    e.printStackTrace();
  } finally {
    IOUtils.closeQuietly(br); // 注意关闭流
    IOUtils.closeQuietly(isr);
    IOUtils.closeQuietly(is);
  }
  String html = sb.toString();
  if (html.contains(filePath)) {
    return null;
  }
  return html;
}
```
### java封装总结
- 我这里直接使用phantomjs是因为设置了环境变量， 否则请使用文件的绝对路径
- 编码格式尤为重要， 否则将出现html乱码问题

# 总结
phantomjs的功能非常强大，使用起来也是非常简单的。本文中只是一些简单的使用，更多的请自行查看[官方API](http://phantomjs.org/api/webpage/)。

# 致谢
这是我第一篇hexo文章，在[Bingo phantomjs](https://bingozb.github.io/51.html)的文章中得到了大量素材与灵感，以此致谢。

