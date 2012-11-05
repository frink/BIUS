/**************************************************************************

	Name: HTML cleaner for the BIUS Editor for jQuery
	Copyright: (c) 2011, Rodney Giles <rodney@rodneygiles.net>
	License: Creative Commons Attribution v3.0
	Version: 0.11

***************************************************************************/

(function($) {
	// Private Variables and Methods
	function __regex(str, reg, fn) {
		if(!str)
			return '';
		var result = [];
		var lastidx = reg.lastIndex;
		var re;
		while((re = reg.exec(str)) != null){
			var idx  = re.index;
			var args = re.concat(idx, str);
			result.push(
					str.slice(lastidx,idx),
					fn.apply(null,args).toString()
			);
			if(!reg.global){
					lastidx += RegExp.lastMatch.length;
					break
			}else{
					lastidx = reg.lastIndex;
			}
		}
		result.push(str.slice(lastidx));
		return result.join('')
	};
	// Namespace Default Function
	$.htmlCleaner = function(html, fn) {
		if(!fn) switch(true) {
			case $.browser.msie: fn = 'msie'; break;
			case $.browser.mozilla: fn = 'mozilla'; break;
			case $.browser.safari: fn = 'safari'; break;
			case $.browser.opera: fn = 'opera'; break;
			case $.browser.chrome: fn = 'chrome'; break;
		}
		if(window.console && window.console.log)
			console.log({cleaner: fn, html: html});
		if(typeof fn == 'string')
			fn = $.htmlCleaner[fn];
		if(typeof fn == 'function')
			return fn.call($.htmlCleaner, html);
		return html;
	};
	// Public Variables and Methods
	$.extend($.htmlCleaner, {
		msie: function(html) {
			html = $.htmlCleaner(html, 'lowercase');
			return html;
		},
		mozilla: function(html) {
			html = $.htmlCleaner(html, 'div_align');
			html = $.htmlCleaner(html, 'hr_mozilla');
			html = $.htmlCleaner(html, 'lowercase');
			html = $.htmlCleaner(html, 'single_tags');
			return html;
		},
		chrome: function(html) {
			html = $.htmlCleaner(html, 'webkit_style');
			html = $.htmlCleaner(html, 'webkit_indent');
			html = $.htmlCleaner(html, 'blockquote_p');
			html = $.htmlCleaner(html, 'single_tags');
			html = $.htmlCleaner(html, 'block_style');
			html = $.htmlCleaner(html, 'p_safari');
			return html;
		},
		safari: function(html) {
			html = $.htmlCleaner(html, 'webkit_style');
			html = $.htmlCleaner(html, 'webkit_indent');
			html = $.htmlCleaner(html, 'blockquote_p');
			html = $.htmlCleaner(html, 'single_tags');
			html = $.htmlCleaner(html, 'block_style');
			html = $.htmlCleaner(html, 'p_safari');
			return html;
		},
		opera: function(html) {
			html = $.htmlCleaner(html, 'blockquote_p');
			html = $.htmlCleaner(html, 'hr_block');
			html = $.htmlCleaner(html, 'lowercase');
			html = $.htmlCleaner(html, 'single_tags');
			//html = $.htmlCleaner(html, 'p_opera');
			return html;
		},
		webkit_style: function(html) {
			return $('<div>' + html + '</div>').find('.Apple-style-span').each(function() {
				var style = $(this).attr('style');
				var doc = $.htmlCleaner($(this).html(), 'webkit');
				if(style.indexOf('bold') >= 0) doc = '<b>' + doc + '</b>';
				if(style.indexOf('italic') >= 0) doc = '<i>' + doc + '</i>';
				if(style.indexOf('underline') >= 0) doc = '<u>' + doc + '</u>';
				if(style.indexOf('line-through') >= 0) doc = '<strike>' + doc + '</strike>';
				$(this).before(doc).remove();
			}).end().html();
		},
		webkit_indent: function(html) {
			return $('<div>' + html + '</div>').find('.webkit-indent-blockquote').each(function() {
				var align = $(this).css('text-align');
				align = align? ' align="' + align + '"' : '';
				var doc = '<blockquote' + align + '>' + $(this).html() + '</blockquote>';
				$(this).before(doc).remove();
			}).end().html();
		},
		div_align: function(html) {
			return $('<div>' + html + '</div>').find('div[@align]').each(function() {
				$(this).contents().attr('align', $(this).attr('align')).insertBefore(this);
				$(this).remove();
			}).end().html();
		},
		blockquote_p: function(html) {
			return $('<div>' + html + '</div>').find('blockquote').each(function() {
				$(this).html('<p>' + $(this).html() + '</p>');
			}).end().html();
		},
		hr_block: function(html) {
			return $('<div>' + html + '</div>').find('hr').each(function() {
				var p = $(this).parent();
				var block = p.is('p, blockquote');
				alert(p.html());
				alert(p[0]);
				var first = block && this == p.contents()[0];
				var last = block && this == p.contents(':last')[0];
				if(first) p.before(this);
				if(last) p.after(this);
				if(first || last) p.parent().html(this.hr_block(p.parent().html()));
			}).end().html();
		},
		lowercase: function(html) {
			return __regex(html, /<(\/)?(\w+)([^>]+)?>/g, function(_, sl, tag, args) {
				if(!sl) sl = '';
				args = __regex(args, / (\w+)="/g, function(_, arg) {
					return ' ' + arg.toLowerCase() + '="';
				});
				return '<' + sl + tag.toLowerCase()+ args + '>';
			});
		},
		hr_mozilla: function(html) {
			return __regex(html, /<hr size="2" width="100%">/g, function(_, sl, tag, args) {
				return '<hr />';
			});
		},
		p_safari: function(html) {
			return __regex(html, /<p><\/p>/g, function(_) {
				return '';
			});
		},
		p_opera: function(html) {
			return __regex(html, /<p><(blockquote|ul|ol)/g, function(_, tag) {
				return '<' + tag;
			});
		},
		p_block: function(html) {
			return __regex(html, /<p><\/p>/g, function(_) {
				return '';
			});
		},
		single_tags: function(html) {
			return __regex(html, /<((hr|img|input|br)([^\/>]*))>/g, function(_, all, tag, args) {
				return '<' + all + ' />';
			});
		},
		block_style: function(html) {
			return __regex(html, /<(p|ol|ul|address|blockquote) style="text-align: (\w+);">/g, function(_, tag, dir) {
				return '<' + tag + ' align="' + dir + '">';
			});
		}
	});
	// Private Variables and Methods
	$.fn.extend({
		htmlCleaner: function() {
			$.htmlCleaner($(this).html());
		}
	});
})(jQuery);
