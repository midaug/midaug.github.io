# CSS自定义滚动条(IE和chrome)


# Chrome滚动条
```css
/*滑道*/
::-webkit-scrollbar {
    width: 5px;
    height: 5px;
    background-color: #f7f7f7;
}
::-webkit-scrollbar-track {
    box-shadow: inset 0 0 6px #f7f7f7;
    border-radius: 10px;
}

/*滑块*/
::-webkit-scrollbar-thumb {
    background-color: #222;
    border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
    background-color: #222;
}

```
<!-- more -->

# IE滚动条
```html
<style type="text/css">
	html{ 
		/*三角箭头的颜色*/  
		scrollbar-arrow-color: #f4ae21;
		/*立体滚动条的颜色*/ 
		scrollbar-face-color: #333; 
		/*立体滚动条亮边的颜色*/  
		scrollbar-3dlight-color: #666;
		/*滚动条空白部分的颜色*/ 
		scrollbar-highlight-color: #666;  
		/*立体滚动条阴影的颜色*/  
		scrollbar-shadow-color: #999;
		/*立体滚动条强阴影的颜色*/  
		scrollbar-darkshadow-color: #666;
		/*立体滚动条背景颜色*/ 
		scrollbar-track-color: #666; 
		/*滚动条的基本颜色*/ 
		scrollbar-base-color:#f8f8f8; 
	}  
</style>
```
# 其他滚动条设置
```html 
<!-- 去掉横向滚动条 -->
<body style="overflow:scroll;overflow-x:hidden"> </body>
<!-- 去掉竖向滚动条 -->
<body style="overflow:scroll;overflow-y:hidden"> </body> 
<!-- 两个都去掉 -->
<body scroll="no"> </body>
```

# 说明
css自定义滚动条现仅支持IE和Chrome，火狐可以使用JS设置滚动条
附上两个github上不错的JS滚动条插件
- [https://github.com/noraesae/perfect-scrollbar](https://github.com/noraesae/perfect-scrollbar)
- [https://github.com/jnicol/trackpad-scroll-emulator](https://github.com/jnicol/trackpad-scroll-emulator)


