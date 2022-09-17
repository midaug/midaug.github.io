# Intel MacOs Big Sur 11.4系统Studio 3T破解


Studio 3T是我用过最好的用的Mongodb客户端，Mac系统未升级到Big Sur前一直使用2019.3.0版本加 data-man-mongodb-ent-2019.3.0.jar使用，直到升级Big Sur后2019.3.0死活打不开了，重新安装，换别的破解版本都不行。目前使用Studio 3T 2020.8.0 加 data-man-mongodb-ent-2019.3.0.jar版本成功在Big Sur上破解运行了，下面分享一下资源和流程

>1. 下载地址：<a href="https://download.csdn.net/download/q358904781/19992377" target="_blank">Studio-3T-for-mac_x86_11.4.zip</a>
解压获得文件如下：
![alt <](/images/post/2021072101/1625216957610.jpg "资源包")

>2. 安装前先用clear.sh清理原来的缓存及文件

>3. 安装 Studio-3T-20200800.dmg 版本
安装完后打开软件让其初始化缓存，什么也不干直接退出

>4. 打开 应用程序 > 右键“显示包内容” > 打开Contents/Resources/app 目录
找到data-man-mongodb-ent-开头文件删除
将data-man-mongodb-ent-2019.3.0.jar 复制进来替换

>5. 执行 sudo spctl --master-disable       //将11.4版本的安全策略重置为允许任何源

>6. 执行 sudo chmod -x ~/.3T/updates   //移除目录权限防止软件自动更新
