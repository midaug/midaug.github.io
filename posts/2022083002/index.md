# Git删除历史版本，保留当前状态


## 前言
> 有时候，我们误提交了某些隐私文件，使用`git rm xxx`删除后，其实版本库中是有历史记录的，想要删除这些记录，但是又不想删除仓库，重建来提交。那么就想办法删除历史记录了。
> 我们当然不能直接删除.git文件夹，这将导致git存储库出现不可预知的问题。

>***注意！这会删除所有的历史记录，谨慎操作***

## 操作步骤
> 要删除所有提交历史记录，但将代码保持在当前状态，可以按照以下方式安全地执行此操作：

1.  创建并切换到`latest_branch`分支
    
  ```shell
 git checkout --orphan latest_branch 
 ```
    
2.  添加所有文件
  ```shell
 git add .
 ```
    
3.  提交更改
  ```shell
 git commit -am "删除历史版本记录，初始化仓库"
 ```

4.  删除分支
  ```shell
 git branch -D master
 ```
  
5.  将当前分支重命名
  ```shell
 git branch -m master
 ```
    
6.  强制更新存储库
  ```shell
git push -f origin master
 ```


