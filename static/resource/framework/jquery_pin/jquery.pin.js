// build time:Fri Jul 06 2018 10:37:08 GMT+0800 (中国标准时间)
(function(t){"use strict";t.fn.pin=function(e){var i=0,s=[],o=false,a=t(window);e=e||{};var n=function(){for(var i=0,n=s.length;i<n;i++){var r="s[i];if(e.minWidth&&a.width()<=e.minWidth){if(r.parent().is(".pin-wrapper")){r.unwrap()}r.css({width:"",left:"",top:"",position:""});if(e.activeClass){r.removeClass(e.activeClass)}o=true;continue}else{o=false}var" p="e.containerSelector?r.closest(e.containerSelector):t(document.body);var" f="r.offset();var" c="p.offset();var" l="r.offsetParent().offset();if(!r.parent().is(".pin-wrapper")){r.wrap("<div" class="pin-wrapper">")}var d=t.extend({top:0,bottom:0},e.padding||{});r.data("pin",{pad:d,from:(e.containerSelector?c.top:f.top)-d.top,to:c.top+p.height()-r.outerHeight()-d.bottom,end:c.top+p.height(),parentTop:l.top});r.css({width:r.outerWidth()});r.parent().css("height",r.outerHeight())}};var r=function(){if(o){return}i=a.scrollTop();var n=[];for(var r=0,p=s.length;r<p;r++){var f="t(s[r]),c=f.data("pin");if(!c){continue}n.push(f);var" l="c.from-c.pad.bottom,d=c.to-c.pad.top;if(l+f.outerHeight()">c.end){f.css("position","");continue}if(l<i&&d>i){!(f.css("position")=="fixed")&&f.css({left:f.offset().left,top:c.pad.top}).css("position","fixed");if(e.activeClass){f.addClass(e.activeClass)}}else if(i>=d){f.css({left:"",top:d-c.parentTop+c.pad.top}).css("position","absolute");if(e.activeClass){f.addClass(e.activeClass)}}else{f.css({position:"",top:"",left:""});if(e.activeClass){f.removeClass(e.activeClass)}}}s=n};var p=function(){n();r()};this.each(function(){var e=t(this),i=t(this).data("pin")||{};if(i&&i.update){return}s.push(e);t("img",this).one("load",n);i.update=p;t(this).data("pin",i)});a.scroll(r);a.resize(function(){n()});n();a.load(p);return this}})(jQuery);
//rebuild by neat </i&&d></p;r++){var></n;i++){var>