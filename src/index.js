var brace={
    evaluate: /\{\{([\s\S]+?(\}?)+)\}\}/g,
    interpolate: /\{\{=([\s\S]+?)\}\}/g,
    encode: /\{\{!([\s\S]+?)\}\}/g,
    use: /\{\{#([\s\S]+?)\}\}/g,
    useParams: /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
    define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
    defineParams: /^\s*([\w$]+):([\s\S]+)/,
    conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
    iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g
}


var bestT = {
    settings: {
      varname: "data",
      strip: true,
      append: true,
      selfcontained: false,
      doNotSkipEncoded: false,
      delimiters:{
        evaluate: /\<\%([\s\S]+?(\}?)+)\%\>/g,
        interpolate: /\<\%=([\s\S]+?)\%\>/g,
        encode: /\<\%!([\s\S]+?)\%\>/g,
        use: /\<\%#([\s\S]+?)\%\>/g,
        useParams: /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
        define: /\<\%##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\%\>/g,
        defineParams: /^\s*([\w$]+):([\s\S]+)/,
        conditional: /\<\%\?(\?)?\s*([\s\S]*?)\s*\%\>/g,
        iterate: /\<\%~\s*(?:\%\>|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\%\>)/g,
      },
    },
    
    filters: {},
    template: undefined,
    compile: undefined,
    render: undefined,
    log: true,
    cache: {}
  },
  _globals;


bestT.useBrace =function(){
  bestT.settings.delimiters= brace;
}


bestT.encodeHTMLSource = function(doNotSkipEncoded) {
  var encodeHTMLRules = {
      "&": "&#38;",
      "<": "&#60;",
      ">": "&#62;",
      '"': "&#34;",
      "'": "&#39;",
      "/": "&#47;"
    },
    matchHTML = doNotSkipEncoded
      ? /[&<>"'\/]/g
      : /&(?!#?\w+;)|<|>|"|'|\//g;
  return function(code) {
    return code
      ? code.toString().replace(matchHTML, function(m) {
        return encodeHTMLRules[m] || m;
      })
      : "";
  };
};

_globals = (function() {
  return this || (0, eval)("this");
}());

var startend = {
    append: {
      start: "'+(",
      end: ")+'",
      startencode: "'+encodeHTML("
    },
    split: {
      start: "';out+=(",
      end: ");out+='",
      startencode: "';out+=encodeHTML("
    }
  },
  skip = /$^/;

function resolveDefs(c, block, def) {
  return ((typeof block === "string")
    ? block
    : block.toString()).replace(c.delimiters.define || skip, function(m, code, assign, value) {
    if (code.indexOf("def.") === 0) {
      code = code.substring(4);
    }
    if (!(code in def)) {
      if (assign === ":") {
        if (c.delimiters.defineParams) {
          value.replace(c.delimiters.defineParams, function(m, param, v) {
            def[code] = {
              arg: param,
              text: v
            };
          });
        }
        if (!(code in def)) { def[code] = value; }
        } else {
        new Function("def", "def['" + code + "']=" + value)(def);
      }
    }
    return "";
  }).replace(c.delimiters.use || skip, function(m, code) {
    if (c.delimiters.useParams) {
      code = code.replace(c.delimiters.useParams, function(m, s, d, param) {
        if (def[d] && def[d].arg && param) {
          var rw = (d + ":" + param).replace(/'|\\/g, "_");
          def.__exp = def.__exp || {};
          def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
          return s + "def.__exp['" + rw + "']";
        }
      });
    }
    var v = new Function("def", "return " + code)(def);
    return v
      ? resolveDefs(c, v, def)
      : v;
  });
}

function unescape(code) {
  return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
}

function filter(codes){
  var code=codes[0];
  for(var i =1; i<codes.length; i++){
    if(/\(/.test(codes[i])){
      var _code=codes[i].split("(");
      if(!bestT.filters[_code[0]]){
        throw new Error("过滤器"+_code[0]+"不存在");
      }
      code="filters['"+_code[0]+"']("+code+","+_code[1];
    }else{
      if(!bestT.filters[codes[i]]){
        throw new Error("过滤器"+codes[i]+"不存在");
      }
      code="filters['"+codes[i]+"']("+code+")";
    }
  }
  return code;
}

bestT.template = function(tmpl, c, def) {
  c = c || bestT.settings;
  var cse = c.append
      ? startend.append
      : startend.split,
    needhtmlencode,
    sid = 0,
    indv,
    str = (c.delimiters.use || c.delimiters.define)
      ? resolveDefs(c, tmpl, def || {})
      : tmpl;

  str = ("var out='" + (c.strip
    ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, " ").replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "")
    : str).replace(/'|\\/g, "\\$&").replace(c.delimiters.interpolate || skip, function(m, code) {
    if(/\|/.test(code)){
      var codeArr;
      if(/\|\|/.test(code)){
        code=code.replace(/\|\|/g,'@#$*');
        code=code.replace(/\|/g,'*$#@');
        code=code.replace(/@#\$\*/g,'||');
        codeArr=code.split('*$#@');
      }else{
        codeArr=code.split('|');
      }
      code =filter(codeArr);
    }
    return cse.start + unescape(code) + cse.end;
  }).replace(c.delimiters.encode || skip, function(m, code) {
    needhtmlencode = true;
    return cse.startencode + unescape(code) + cse.end;
  }).replace(c.delimiters.conditional || skip, function(m, elsecase, code) {
    return elsecase
      ? (code
        ? "';}else if(" + unescape(code) + "){out+='"
        : "';}else{out+='")
      : (code
        ? "';if(" + unescape(code) + "){out+='"
        : "';}out+='");
  }).replace(c.delimiters.iterate || skip, function(m, iterate, vname, iname) {
    if (!iterate) { return "';} } out+='"; }
    sid += 1;
    indv = iname || "i" + sid;
    iterate = unescape(iterate);
    return "';var arr" + sid + "=" + iterate + ";if(arr" + sid + "){var " + vname + "," + indv + "=-1,l" + sid + "=arr" + sid + ".length-1;while(" + indv + "<l" + sid + "){" + vname + "=arr" + sid + "[" + indv + "+=1];out+='";
  }).replace(c.delimiters.evaluate || skip, function(m, code) {
    return "';" + unescape(code) + "out+='";
  }) + "';return out;").replace(/\n/g, "\\n").replace(/\t/g, '\\t').replace(/\r/g, "\\r").replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, "");

  if (needhtmlencode) {
    if (!c.selfcontained && _globals && !_globals._encodeHTML) { _globals._encodeHTML = bestT.encodeHTMLSource(c.doNotSkipEncoded); }
    str = "var encodeHTML = typeof _encodeHTML !== 'undefined' ? _encodeHTML : (" + bestT.encodeHTMLSource.toString() + "(" + (c.doNotSkipEncoded || '') + "));" + str;
  }
  try {
    return new Function(c.varname,"filters", str);
  } catch (e) {
    if (typeof console !== "undefined") { console.log("无法创建这个模板函数: " + str); }
    throw e;
  }
};

bestT.render=function(tmpl,data,def,id){
  if(typeof def!=='object'){
    def=null;
    id=def;
  }
  return bestT.compile(tmpl,def,id)(data,bestT.filters);
};
bestT.renderDom=function(dom,tmpl,data,def,id){
  if(typeof dom!=='object'||!dom.tagName){
    dom=document.getElementById(dom.replace(/^#/, ""));
  }
  dom.innerHTML=bestT.render(tmpl,data,def,id);
};

bestT.compile = function(tmpl,def,id) {
  if(typeof def!=='object'){
    def=null;
    id=def;
  }
  var template;
  if(bestT.cache[id]){
    template=bestT.cache[id];
  }else{
    if(typeof tmpl==="object"&&tmpl.tagName){
      tmpl=tmpl.innerHTML;
    }else if(typeof tmpl==="string"&&!/</.test(tmpl)){
      tmpl=document.getElementById(tmpl.replace(/^#/, ""));
      tmpl=tmpl?tmpl.innerHTML:"";
    }
    template=bestT.template(tmpl, null,def);
    if(id){
      bestT.cache[id]=template;
    }
  }
  return template;
};

module.exports =  bestT;
