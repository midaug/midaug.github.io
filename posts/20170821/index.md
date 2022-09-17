# 树莓派3安装centos7的无线WIFI模块


入手raspberry pi3，觉着还是刷个centos系统比较顺手。整理了一下刷centos后WIFI问题解决方式。

<!-- more -->

### 驱动安装
```bash
# 直接执行下面命令即可，如果没有网络就使用u盘拷贝到对应的目录下
curl --location https://github.com/RPi-Distro/firmware-nonfree/raw/54bab3d6a6d43239c71d26464e6e10e5067ffea7/brcm80211/brcm/brcmfmac43430-sdio.bin > /usr/lib/firmware/brcm/brcmfmac43430-sdio.bin

curl --location https://github.com/RPi-Distro/firmware-nonfree/raw/54bab3d6a6d43239c71d26464e6e10e5067ffea7/brcm80211/brcm/brcmfmac43430-sdio.txt > /usr/lib/firmware/brcm/brcmfmac43430-sdio.txt

# 重启
reboot
```

### 查看无线网卡并连接WIFI
```bash
nmcli d
nmcli d wifi　　#查看周围的wifi
nmcli d wifi connect yourSSID password 'yourpassword'  #连接wifi  SSID就是WIFI名称
nmcli d show wlan0  #查看wlan0的状态
```

### 设置静态IP
```bash
#设置网络配置信息vi   /etc/sysconfig/network-script/ifcfg-????   #????是wifi的名字
BOOTPROTO=static              #静态IP
IPADDR=192.168.31.160       #IP地址
GATEWAY=192.168.31.1    #默认网关
NETMASK=255.255.255.0  #子网掩码
```

### 修改DNS
```bash
# vi /etc/resolv.conf #修改以下内容
nameserver 8.8.8.8 #google域名服务器
nameserver 8.8.4.4 #google域名服务器  223.5.5.5  阿里dns 
nameserver 114.114.114.114  
```
