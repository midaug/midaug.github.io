# ubuntu下RabbitMQ安装及集群配置


# RabbitMQ简介
以熟悉的电商场景为例，如果商品服务和订单服务是两个不同的微服务，在下单的过程中订单服务需要调用商品服务进行扣库存操作。按照传统的方式，下单过程要等到调用完毕之后才能返回下单成功，如果网络产生波动等原因使得商品服务扣库存延迟或者失败，会带来较差的用户体验，如果在高并发的场景下，这样的处理显然是不合适的，那怎么进行优化呢？这就需要消息队列登场了。

消息队列提供一个异步通信机制，消息的发送者不必一直等待到消息被成功处理才返回，而是立即返回。消息中间件负责处理网络通信，如果网络连接不可用，消息被暂存于队列当中，当网络畅通的时候在将消息转发给相应的应用程序或者服务，当然前提是这些服务订阅了该队列。如果在商品服务和订单服务之间使用消息中间件，既可以提高并发量，又降低服务之间的耦合度。

RabbitMQ就是这样一款我们苦苦追寻的消息队列。RabbitMQ是一个开源的消息代理的队列服务器，用来通过普通协议在完全不同的应用之间共享数据。

RabbitMQ是使用Erlang语言来编写的，并且RabbitMQ是基于AMQP协议的。Erlang语言在数据交互方面性能优秀，有着和原生Socket一样的延迟，这也是RabbitMQ高性能的原因所在。可谓“人如其名”，RabbitMQ像兔子一样迅速。

# RabbitMQ集群模式
## 普通模式
默认模式，以两个节点（rabbit01、rabbit02）为例来进行说明。对于Queue来说，消息实体只存在于其中一个节点rabbit01（或者rabbit02），rabbit01和rabbit02两个节点仅有相同的元数据，即队列的结构。当消息进入rabbit01节点的Queue后，consumer从rabbit02节点消费时，RabbitMQ会临时在rabbit01、rabbit02间进行消息传输，把A中的消息实体取出并经过B发送给consumer。所以consumer应尽量连接每一个节点，从中取消息。即对于同一个逻辑队列，要在多个节点建立物理Queue。否则无论consumer连rabbit01或rabbit02，出口总在rabbit01，会产生瓶颈。当rabbit01节点故障后，rabbit02节点无法取到rabbit01节点中还未消费的消息实体。如果做了消息持久化，那么得等rabbit01节点恢复，然后才可被消费；如果没有持久化的话，就会产生消息丢失的现象。
## 镜像模式
把需要的队列做成镜像队列，存在与多个节点属于RabbitMQ的HA方案。该模式解决了普通模式中的问题，其实质和普通模式不同之处在于，消息实体会主动在镜像节点间同步，而不是在客户端取数据时临时拉取。该模式带来的副作用也很明显，除了降低系统性能外，如果镜像队列数量过多，加之大量的消息进入，集群内部的网络带宽将会被这种同步通讯大大消耗掉。所以在对可靠性要求较高的场合中适用。

<!-- more -->

# ubuntu下安装RabbitMQ集群
## 1.配置节点hosts
先配置节点hosts，用于集群，再安装RabbitMQ， 不然安装后可能读不到配置的hosts。如果有自建DNS更佳。
```bash
vim /etc/hosts #在每个节点上编辑/etc/hosts文件写入以下内容
192.168.10.101 node1
192.168.10.102 node2
192.168.10.103 node3
```

## 2.rabbitmq-server安装
以ubuntu为例，使用下面快速安装脚本
```bash
#!/bin/sh
## 官方最新版安装脚本
## Install RabbitMQ signing key
curl -fsSL https://github.com/rabbitmq/signing-keys/releases/download/2.0/rabbitmq-release-signing-key.asc | sudo apt-key add -
## Install apt HTTPS transport
sudo apt-get install apt-transport-https
## Add Bintray repositories that provision latest RabbitMQ and Erlang 21.x releases
sudo tee /etc/apt/sources.list.d/bintray.rabbitmq.list <<EOF
deb https://dl.bintray.com/rabbitmq-erlang/debian bionic erlang-21.x
deb https://dl.bintray.com/rabbitmq/debian bionic main
EOF
## Update package indices
sudo apt-get update -y
## Install rabbitmq-server and its dependencies
sudo apt-get install rabbitmq-server -y --fix-missing
```

## 3.在每个节点启用管理插件
```bash
sudo rabbitmq-plugins enable rabbitmq_management
sudo rabbitmq-plugins enable rabbitmq_tracing
#如果服务已经在启动则先执行 rabbitmqctl stop_app
#然后再执行rabbitmq-plugins enable
#最后重新start：rabbitmqctl start_app
```

## 4.加入集群
因为RabbitMQ集群是基于erlang同步的，所以先配置使各个节点 中 .erlang.cookie文件一致。
```bash
#启动集群前先统一所有节点.erlang.cookie文件，注意文件权限
scp /var/lib/rabbitmq/.erlang.cookie root@node2:/var/lib/rabbitmq/
#systemctl start rabbitmq-server.service 启动所有节点
#假定node1是主节点， 其他节点依次执行
rabbitmqctl stop_app
rabbitmqctl reset
rabbitmqctl join_cluster rabbit@node1 #node1的名称与 rabbitmqctl cluster_status 中的信息一致
#rabbitmqctl join_cluster rabbit@node1 --ram #添加为内存节点，默认为磁盘
rabbitmqctl start_app
```
集群重启顺序（如果没有内存节点请忽略）
集群重启的顺序是固定的，并且是相反的。 如下所述：
* 启动顺序：磁盘节点 => 内存节点
* 关闭顺序：内存节点 => 磁盘节点

## 5.创建RabbitMQ用户
设置用户命令, 建议创建好集群后再设置， 不然会被集群配置覆盖
```bash
rabbitmqctl add_user sunday sunday                        # 创建账号
rabbitmqctl set_user_tags sunday administrator            # 设置用户角色
rabbitmqctl set_permissions -p "/" sunday ".*" ".*" ".*"  # 设置用户权限
rabbitmqctl list_users                                    # 查看用户列表
rabbitmqctl change_password username password # 修改用户密码

#其他命令
rabbitmqctl status          #查看服务信息
rabbitmqctl cluster_status  #查看集群状态
   Cluster status of node rabbit@node1 ...
    [{nodes,[{disc,[rabbit@node1,rabbit@node2,rabbit@node3]}]},
    {running_nodes,[rabbit@node3,rabbit@node2,rabbit@node1]},
    {cluster_name,<<"rabbit@node1">>},
    {partitions,[]},
    {alarms,[{rabbit@node3,[]},{rabbit@node2,[]},{rabbit@node1,[]}]}]
```

## 6.命令行开启镜像策略
```bash
#开启所有队列为镜像队列"^"匹配名称为所有， "^ha."匹配名称为ha开头的
rabbitmqctl set_policy ha-all "^" '{"ha-mode":"all"}'

rabbitmqctl set_policy [-p Vhost] Name Pattern Definition [Priority]

-p Vhost： 可选参数，针对指定vhost下的queue进行设置
Name: policy的名称
Pattern: queue的匹配模式(正则表达式)
Definition：镜像定义，包括三个部分ha-mode, ha-params, ha-sync-mode
        ha-mode:指明镜像队列的模式，有效值为 all/exactly/nodes
        all：表示在集群中所有的节点上进行镜像
        exactly：表示在指定个数的节点上进行镜像，节点的个数由ha-params指定
        nodes：表示在指定的节点上进行镜像，节点名称通过ha-params指定
        ha-params：ha-mode模式需要用到的参数
        ha-sync-mode：进行队列中消息的同步方式，有效值为automatic和manual
priority：可选参数，policy的优先级
```

# docker-compose快速安装单节点
这里使用的启用mqtt的镜像，无需mqtt也可以使用别的
集群安装请参考 [docker-compose安装rabbitmq集群(主从集群---》镜像集群)](https://www.cnblogs.com/yloved/p/12868892.html)
```yaml
version: "3"
services:
  rabbitmq-mqtt:
    container_name: rabbitmq-mqtt
    environment:
    - RABBITMQ_MQTT_DEFAULT_PASS=admin
    - RABBITMQ_MQTT_DEFAULT_USER=admin
    - RABBITMQ_MQTT_VHOST=/
    - RABBITMQ_DEFAULT_PASS=admin
    - RABBITMQ_DEFAULT_USER=admin
    - RABBITMQ_DEFAULT_VHOST=/
    image: cyrilix/rabbitmq-mqtt:latest
    volumes:
    - ./data:/var/lib/rabbitmq    
    ports:
    - 25672:25672/tcp
    - 4369:4369/tcp
    - 5671:5671/tcp
    - 5672:5672/tcp
    - 8883:8883/tcp
    - 15672:15672/tcp
    - 1883:1883/tcp
    restart: always
```
