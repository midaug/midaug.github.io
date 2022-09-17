# MongoDB快速同步脚本


```bash
#!/bin/bash
#锁定脚本执行目录  
DIR="$( cd "$( dirname "$0"  )" && pwd )"
cd "${DIR}"

#指定执行命令
MONGODUMP=mongodump
MONGORESTORE=mongorestore
#设置tmp或备份目录
BACKUP_DIR="./sync/backup"
NOW=`date +"%Y-%m-%d-%H%M"`

#源数据库
DB_SRC_HOST="host:port"
DB_SRC_USER=user
DB_SRC_PASSWD=passwd
DB_SRC_NAME=database

#对象数据库
DB_DES_HOST="host:port"
DB_DES_USER=user
DB_DES_PASSWD=passwd
DB_DES_NAME=database

#指定需要同步的表名称
COLLECTIONS="
table1
table2
"
##COLLECTIONS="" 为同步database下所有的表

#创建目录
BACKUP_PATH=$BACKUP_DIR/$DB_SRC_NAME/$NOW
mkdir -p $BACKUP_PATH


#do backup
if [ ! -n "$COLLECTIONS" ]; then
    $MONGODUMP -h $DB_SRC_HOST -d $DB_SRC_NAME -u $DB_SRC_USER -p $DB_SRC_PASSWD -o $BACKUP_PATH
else
    for c in $COLLECTIONS
    do
       $MONGODUMP -h $DB_SRC_HOST -d $DB_SRC_NAME -u $DB_SRC_USER -p $DB_SRC_PASSWD -o $BACKUP_PATH -c $c
    done
fi

#do override to the dest database.
echo "$MONGORESTORE -d $DB_DES_NAME -h $DB_DES_HOST -u $DB_DES_USER -p $DB_DES_PASSWD --drop $BACKUP_PATH/$DB_SRC_NAME"
$MONGORESTORE -d $DB_DES_NAME -h $DB_DES_HOST -u $DB_DES_USER -p $DB_DES_PASSWD --drop $BACKUP_PATH/$DB_SRC_NAME

#注释删除即为备份
rm -rf $BACKUP_PATH
```
