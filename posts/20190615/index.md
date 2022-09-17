# Nginx作为文件下载服务器


#

### Nginx conf 配置
```bash
server {
    listen      80;
    server_name  10.43.0.0;
    #charset koi8-r;
    #access_log  /var/log/nginx/log/host.access.log  main;
    location / {
        root  /usr/share/nginx/html;
        index  index.html index.htm;
    }
    #error_page  404              /404.html;
    # redirect server error pages to the static page /50x.html
    #
    error_page  500 502 503 504  /50x.html;
    location = /50x.html {
        root  /usr/share/nginx/html;
    }
    location /build_results/ {
        proxy_set_header Host $http_host;
        root  /data/jenkins/;
        index  index.html index.htm;
        autoindex on; # 开启目录文件列表
        autoindex_exact_size off; # 显示出文件的确切大小，单位是bytes
        autoindex_localtime on; # 显示的文件时间为文件的服务器时间
        charset utf-8,gbk; # 避免中文乱码
        #add_after_body /autoindex.html; #添加html内容， 此文件应放置在 location / 配置的 root目录下
        #add_before_body /autoindex.html;

        #auth_basic "Restricted"; #启用账号密码限制  #这里是验证时的提示信息
        #auth_basic_user_file /etc/nginx/passwd; #这里是密码文件
        #limit_conn one 8;        #并发数
        #limit_rate 100k;        #单个线程最大下载速度，单位KB/s
        #allow 192.168.1.0/24;    #添加允许访问下载 IP 地址段
        #allow 172.17.0.0/16;
        #deny  all; #禁用其他
    }
}
```
<!-- more -->

### 配置Basic Auth权限认证

我们需要htpassword来创建和生成加密的用户用于基础认证(Basic Authentication)
ubuntu 安装 sudo apt-get install apache2-utils

```bash
htpasswd 命令参数
-c 创建passwdfile.如果passwdfile 已经存在,那么它会重新写入并删去原有内容.
-n 不更新passwordfile，直接显示密码
-m 使用MD5加密（默认）
-d 使用CRYPT加密（默认）
-p 使用普通文本格式的密码
-s 使用SHA加密
-b 命令行中一并输入用户名和密码而不是根据提示输入密码，可以看见明文，不需要交互
-D 删除指定的用户

sudo htpasswd -c /etc/nginx/passwd Postgres #创建密码文件以及用户名=

#/etc/nginx/passwd 文件格式如下:
loginuser:password

#Nginx配置文件新增内容:
location /secret {
    auth_basic "Please input password"; #这里是验证时的提示信息
    auth_basic_user_file /etc/nginx/passwd; # 创建的passwd文件
}
```

### 优化显示页面
对日期进行格式化，并添加导航路径
#add_after_body /autoindex.html; #添加html内容， 此文件应放置在 location / 配置的 root目录下

```javascript
<script>
    var formatDate = function (datetime, format) {
        if (!isNaN(Date.parse(datetime))) {
            d = new Date(datetime);
            pad = function (s) { return s < 10 ? '0' + s : s };
            mon = function (m) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] };
            datetime = format
                .replace('%Y', d.getFullYear())
                .replace('%m', pad(d.getMonth() + 1))
                .replace('%d', pad(d.getDate()))
                .replace('%H', pad(d.getHours()))
                .replace('%M', pad(d.getMinutes()))
                .replace('%S', pad(d.getSeconds()))
                .replace('%b', mon(d.getMonth()));
        }
        return datetime;
    };
    window.onload = function () {
        var datetime_format = '%Y-%m-%d %H:%M';
        setTimeout(function () {
            var title = document.getElementsByTagName("h1")[0];
            var lastName;
            var titlehtml = document.title.replace(/\/$/, '').split('/').slice(1).reduce(function (acc, v, i, a) {
                lastName = v;
                return acc + '<a href="/' + a.slice(0, i + 1).join('/') + '/">' + v + '</a>/';
            }, 'Index of /');
            title.innerHTML = titlehtml + '<span style="margin-left: 100px;">' + lastName + '</span>';
        }, 1);
        setTimeout(function () {
            var pre = document.getElementsByTagName("pre")[0];
            var bodys = pre.innerHTML.split("\n");
            var list = [];
            for (var i in bodys) {
                var bodyline = bodys[i];
                if (m = /\s*<a href="(.+?)">(.+?)<\/a>\s+(\S+)\s+(\S+)\s+(\S+)\s*/.exec(bodyline)) {
                    filename = m[1];
                    datetime = m[3] + ' ' + m[4];
                    size = m[5];
                    list.push(bodyline.replace(datetime, formatDate(datetime, datetime_format)));
                } else {
                    list.push(bodyline);
                }
            }
            pre.innerHTML = list.join("\n");
        }, 1);
    };
</script>
<style>
    a {text-decoration: none;}
    a:visited {text-decoration: none;}
    a:hover {text-decoration: none;}
    a:active {text-decoration: none;}
    h1 {font-size: 20px;}
</style>
```

