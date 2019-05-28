# 模板引擎 [![Build Status](https://travis-ci.org/yuhonyon/f2e-bestT.svg?branch=master)](https://travis-ci.org/yuhonyon/f2e-bestT) [![npm](https://img.shields.io/npm/v/@fastweb/html-temp.svg)](https://www.npmjs.com/package/@fastweb/html-temp)
------
>根据doT.js修改,特点是快，小，无依赖其他插件。新增支持过滤器,ejs语法,缓存

## 安装
```bash
yarn add best-template
```

## 用法
```html
<html>
<div id="app"></div>
<script id="app-temp" type="text/temp">
  <div><%=data.title%></div>
  <ul>
  <%for(var i=0;i<data.list.length;i++){%>
    <li><%=data.list[i]%></li>
  <%}%>
  </ul>
</script>
</html>
```
```js
import bestT from "@fastweb/http-temp";
let mydata={
  title:'题目',
  list:[1,2,3,4,5]
}
bestT.renderDom('app','app-temp',mydata)
```

## 方法

### renderDom  渲染模板插入dom
`bestT.renderDom(dom,tmpl,data,def,id)`
参数:
* dom(string|dom)-被插入渲染结果的dom
* tmpl(string)-模板
* data(object)-数据
* def(object)(可选)-模板片段
* id(number|string)(可选)-唯一id(提高渲染速度)

### render 渲染模板返回html
`bestT.renderDom(tmpl,data,def,id)`
参数同renderDom

### compile 返回模板函数
bestT.compile(tmpl,def,id)
参数同renderDom

```
bestT.renderDom(dom,tmpl,data)
//等同
dom.innerHTML=bestT.render(tmpl,data)
//等同
dom.innerHTML=bestT.compile(tmpl)(data)
```

## 过滤器 |
```js
  bestT.filters={
    sex:function(str){
      if(str==0){
        return "男人"
      }else if(str==1){
        return "女人"
      }
      return "妖人"
    },
    describe:function(str){
      if(/男/.test(str)){
        return '帅气的'+str
      }else if(/女/.test(str)){
        return '漂亮的'+str
      }
      return str
    },
    age:function(str){
      if(srt>18){
        return "成年"
      }
      return "未成年"
    }
  }
  let tmpl=`<div><%=data.name%>是一个<%=data.age|age%><%=data.sex|sex|describe%></div>`;
  let data={
    name:'老王',
    age:'40',
    sex:0
  }
  bestT.render(tmpl,data);
  //<div>老王是一个成年帅气的男人</div>

```

## 模板语法
同ejs,常用`<%%>`,`<%=%>`
