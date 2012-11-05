/**************************************************************************

	Name: The BIUS Editor for jQuery
	Copyright: (c) 2011, Rodney Giles <rodney@rodneygiles.net>
	License: Creative Commons Attribution v3.0
	Version: 0.13

	OPTIONAL:
		* jquery.hotkeys.js - Add full hotkey support.
		* jquery.htmlclean.js - Unified html output.

	USAGE:
		Autoload by specifying the bius="" attrbute in the HTML
			<textarea bius="text" />
			<div bius="text" buttons="bold,italic,underline,strikethrough">
				<p>some test to edit</p>
			</div>
	
		Creating with a script:
			// use default options
			$('div.editable').bius();
	
			// specify <buttons>
			$('div.editable').bius('bold,italic,underline,strikethrough,biussave');
	
			// specify <buttons> & <contents>
			$('div.editable').bius('formattext,bold,italic,underline,strikethrough,biussave', '<p>preload this text in the editor</p>');
	
			// specify <bius_id> & <buttons> & <contents>
			$('div.editable').bius('biusEditorID', 'rebius,biussave,unbius', '<p>initial edit text</p>');
	
		Returning to regular html:
			$('div.editable').unbius();

	DOCUMENTATION:
		Many more options are available including creating your
		own buttons and actions. More documentation to follow.

***************************************************************************/

(function($) {
	// Private Variables and Methods
	var __idarr = {};
	var __menus = 0;
	function __try(testfn, okfn, errfn) {
		if(!errfn) {
			errfn = okfn;
			okfn = null;
		}
		var r;
		try {
			r = testfn();
		} catch(e) {
			if(errfn)
				return errfn(e);
			// if(window.console && window.console.log)
			// 	console.log(e);
			return e;
		}
		if(okfn)
			return okfn(r);
		return r;
	};
	function __populateToolbar(id, $iframe, $toolbar, buttons) {
		//alert(buttons);
		var actions = $.bius.actions;
		var useCSS = false;
		var idoc = $iframe[0].contentWindow.document;
		var $idoc = $(idoc);
		buttons = buttons.join? buttons : __parseButtons(buttons);
		for(var button in buttons) {
			var act = buttons[button];
			var keys = '';
			var title = '';
			var script = '';
			var menus = '';
			if(act == 'styleWithCSS') {
				useCSS = true;
				continue;
			} else if(act.join) {
				button = act[0];
				menus = act[1];
				act = 'menu' + __menus++;
				$menu = $('<div class="bius_menu" id="bius_' + act + '" onmouseover="this.hover = true; $(this).show(); if(this.e) clearTimeout(this.e);" onmouseout="var me = this; me.e = setTimeout(function(){ me.hover = false; $(me).fadeOut(300); }, 100);"></div>').appendTo($toolbar).wrap('<div class="bius_menu_place"></div>');
				__populateToolbar(id, $iframe, $menu, menus);
				script = 'class="bius_menu_button" onmouseover="$(\'.bius_menu\').hide(); $(\'#bius_' + act + '\').fadeIn(100);" onmouseout="setTimeout(function(){ $(\'#bius_' + act + '\').each(function(){ if(!this.hover) $(this).fadeOut(300); }); }, 300);"';
			} else if(!actions[act]) {
				if(act == '|')
					$toolbar.append('<hr class="spacer" />');
				continue;
			} else {
				button = actions[act].button;
				title = actions[act].title;
				if(actions[act].menu) {
					menus = actions[act].menu.split(' ');
					act = 'menu' + __menus++;
					$menu = $('<div class="bius_menu" id="bius_' + act + '" onmouseover="this.hover = true; $(this).show(); if(this.e) clearTimeout(this.e);" onmouseout="var me = this; me.e = setTimeout(function(){ me.hover = false; $(me).fadeOut(300); }, 100);"></div>').appendTo($toolbar).wrap('<div class="bius_menu_place"></div>');
					__populateToolbar(id, $iframe, $menu, menus);
					script = 'class="bius_menu_button" onmouseover="$(\'.bius_menu\').hide(); $(\'#bius_' + act + '\').fadeIn(100);" onmouseout="setTimeout(function(){ $(\'#bius_' + act + '\').each(function(){ if(!this.hover) $(this).fadeOut(300); }); }, 300);"';
				} else {
					if($.hotkeys && actions[act].hotkeys && actions[act].hotkeys.join) {
						keys += ' (' + actions[act].hotkeys.join(' or ') + ')';
					}
					script = 'onclick="jQuery.bius.command(\'' + id + '\', \'' + act + '\'); $(\'#bius_frame_' + id + '\').blur().focus(); return false;"';
				}
			}
			$toolbar.append('<button id="bius_button_' + id + '_' + act + '" act="' + title + '" title="' + title + keys + '" ' + script +'>' + button + '</button>');
		}
		var color = $toolbar.find('button:first').css('color');
		$toolbar.find('hr').css({background: color, color: color});
		$toolbar.find('.bius_menu').css({border: '1px solid ' + color});
		$idoc.bind('keyup mouseup focus selectstart', function() {
			if(__editorEnable($iframe, '?'))
				__updateButtons(id, idoc, buttons);
		});
		if($.browser.mozilla)
			$.bius.command(id, 'styleWithCSS', useCSS);
	};
	function __parseButtons(buttons, menus) {
		var re = /\((!|[\w ]+):([^()]+)\)/;
		var m, b;
		menus = menus? menus : [];
		if(!buttons.join) {
			buttons = buttons.replace(/,/g, ' ');
			while(m = buttons.match(re)) {
				buttons = buttons.replace(re, menus.length);
				menus[menus.length] = [m[1], m[2].trim().split(' ')];
			}
			buttons = buttons.split(' ');
		}
		for(b in buttons) {
			if(!isNaN(buttons[b]) && '' != buttons[b]) {
				buttons[b] = menus[buttons[b]];
				buttons[b][1] = __parseButtons(buttons[b][1], menus);
			}
		}
		return buttons;
	};
	function __updateButtons(id, idoc, buttons) {
		for(button in buttons) {
			var act = buttons[button];
			var $button = $('#bius_button_' + id + '_' + act);
			var ok = false;
			switch(act) {
				case 'bold':
				case 'italic':
				case 'underline':
				case 'strikethrough':
				case 'justifyleft':
				case 'justifycenter':
				case 'justifyright':
				case 'justifyfull':
				case 'subscript':
				case 'subperscript':
				case 'contentReadOnly':
				case 'insertorderedlist':
				case 'insertunorderedlist':
					ok = true;
					break;
				default:
					if($.bius.actions[act] && $.bius.actions[act].test)
						ok = $.bius.actions[act].test(id, idoc);
			}
			if(ok && ($.bius.actions[act] && $.bius.actions[act].test || true == __try(function() { return idoc.queryCommandState(act); })))
				$button.addClass('bius_select');
			else
				$button.removeClass('bius_select');
		}
	};
	function __activateHotkeys(id, $iframe, buttons) {
		var actions = $.bius.actions;
		if(!$.hotkeys)
			return;
		for(var button in buttons) {
			var act = buttons[button];
			$iframe.bindHotkeys(actions[act].hotkeys, {data: {id: id, act: act}}, function(ev) {
				$.bius.command(ev.data.id, ev.data.act, ev.data.value);
				return false;
			});
		}
	};
	function __biusEvent($source, onevent) {
		var r;
		fn = $source.attr(onevent);
		if(fn) fn = new Function(fn);
		if(typeof fn == 'function')
			r = __try(function() {
				if($source[0][onevent])
					return !(r = $source[0][onevent]())? r : fn.call($source[0]);
				return fn.call($source[0]);
			});
		r = typeof r == 'undefined'? true : r;
		return r;
	};
	function __editorEnable($iframe, enable, fn) {
		var idoc = $iframe[0].contentWindow.document;
		if(enable == '?')
			return (idoc.designMode.toLowerCase() == 'on');
		if(__try(function() {
			idoc.designMode = enable? "on" : "off";
			if(fn)
				fn();
			return true;
		}))
			return true;
		setTimeout(function() {
			__editorEnable($iframe, enable, fn)
		}, 2500);
		return false;
	};
	function __editorContent($iframe, txt, css) {
		var idoc = $iframe[0].contentWindow.document;
		css = css? '<link type="text/css" rel="stylesheet" href="' + css + '" />' : '<style>' +
			'html, body, hr { border: none; }' +
			'hr { background: #000; width: 90%; height: 2px; align: center; }' +
			'p, blockquote { margin: 6px !important;}' +
			'blockquote { font-size: .9em; margin: 2px 15px 6px !important; }' +
			'</style>';
		txt = '<'+'?xml version="1.0" encoding="UTF-8"?'+'><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' + css + '</head><body class="bius_body">' + txt + '</body></html>';
		return __try(function() {
			idoc.open();
			idoc.write(txt);
			idoc.close();
		});
	}
	function __getBius(id, obj) {
		if(!obj) obj = document;
		if(id)
			return $(obj).find('#bius_editor_' + id);
		else if($(obj).is('.bius_editor'))
			return $(obj);
		else
			return $(obj).find('.bius_editor');
	};
	function __cleanHTML(html) {
		if($.htmlCleaner)
			return $.htmlCleaner(html);
		return html;
	};
	function __getSelect($iframe) {
		if($iframe[0])
			var iwin = $iframe[0].contentWindow;
		else
			return false;
		if ( iwin.document.selection )
			return iwin.document.selection.createRange().text;
		else
			return iwin.getSelection().toString();
	};
	// Namespace Default Function
	$.bius = function(buttons) {
		buttons = buttons? buttons : $.bius.buttons;
		var r = 0;
		r += $(document).rebius(buttons).length;
		r += $(document).bius(buttons).length;
		return r > 0;
	};
	// Public Variables and Methods
	$.extend($.bius, {
		buttons: 'filemenu editmenu insertmenu formatmenu | bold italic underline strikethrough | sizemenu insertlink justifyleft justifycenter justifyright justifyfull indent outdent | editcode unbius',
		actions: {
			filemenu: {
				title: '',
				button: 'File',
				menu: 'unbius savebius rebius exitbius'
			},
			editmenu: {
				title: '',
				button: 'Edit',
				menu: 'cut copy paste | undo redo | editcode'
			},
			insertmenu: {
				title: '',
				button: 'Insert',
				menu: 'insertlink insertvideo | inserthorizontalrule insertorderedlist insertunorderedlist'
			},
			formatmenu: {
				title: '',
				button: 'Format',
				menu: 'p headingsmenu | pre code address'
			},
			sizemenu: {
				title: '',
				button: '!',
				menu: 'removeformat | increasefontsize decreasefontsize | superscript subscript'
			},
			headingsmenu: {
				title: 'Headings',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H1</span>',
				menu: 'h1 h2 h3 h4 h5 h6'
			},
			p: {
				title: 'Paragraph',
				button: '<span style="font: bold 1.1em Arial; padding-right: .2em;">&para;</span>',
				hotkeys: ['Ctrl+Alt+0']
			},
			h1: {
				title: 'Heading 1',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H1</span>',
				hotkeys: ['Ctrl+Alt+1']
			},
			h2: {
				title: 'Heading 2',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H2</span>',
				hotkeys: ['Ctrl+Alt+2']
			},
			h3: {
				title: 'Heading 3',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H3</span>',
				hotkeys: ['Ctrl+Alt+3']
			},
			h4: {
				title: 'Heading 4',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H4</span>',
				hotkeys: ['Ctrl+Alt+4']
			},
			h5: {
				title: 'Heading 5',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H5</span>',
				hotkeys: ['Ctrl+Alt+5']
			},
			h6: {
				title: 'Heading 6',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">H6</span>',
				hotkeys: ['Ctrl+Alt+6']
			},
			pre: {
				title: 'Preformated',
				button: '<span style="position: relative; top: -.2em; font: .75em Arial; padding-right: .4em;">PRE</span>',
				hotkeys: ['Ctrl+Alt+7']
			},
			address: {
				title: 'Address',
				button: '<span style="position: relative; top: -.2em; font: .65em Arial; padding-right: .4em;">ADDR</span>',
				hotkeys: ['Ctrl+Alt+8']
			},
			code: {
				title: 'Source Code',
				button: '<span style="position: relative; top: -.2em; font: .65em Arial; padding-right: .4em;">CODE</span>',
				hotkeys: ['Ctrl+Alt+9']
			},
			bold: {
				title: 'Bold',
				button: '<span style="font: bold 1.15em Georgia;">B</span>',
				hotkeys: ['Ctrl+B', 'Ctrl+Shift+B']
			},
			italic: {
				title: 'Italic',
				button: '<span style="font: italic 1.15em Georgia;">I</span>',
				hotkeys: ['Ctrl+I', 'Ctrl+Shift+I']
			},
			underline: {
				title: 'Underline',
				button: '<span style="font: 1.1em Georgia; text-decoration: underline;">U</span>',
				hotkeys: ['Ctrl+U', 'Ctrl+Shift+U']
			},
			strikethrough: {
				title: 'Strike',
				button: '<span style="font: 1.14em Georgia; text-decoration: line-through;">S</span>',
				hotkeys: ['Ctrl+K', 'Ctrl+Shft+K']
			},
			justifyleft: {
				title: 'Align Left',
				button: '<span style="position: relative; display: block; width: 1em; margin: .2em auto;"><hr style="float: left; width: 100%;" /><hr style="float: left; width: 90%;" /><hr style="float: left; width: 75%;" /><hr style="float: left; width: 85%;" /><hr style="float: left; width: 90%;" /><hr style="float: left; width: 60%;" /></span>',
				hotkeys: ['Alt+L', 'Ctrl+L']
			},
			justifycenter: {
				title: 'Center',
				button: '<span style="position: relative; display: block; width: 1em; margin: .2em auto;"><hr style="margin-right: auto; margin-left: auto; width: 100%;" /><hr style="margin-right: auto; margin-left: auto; width: 90%;" /><hr style="margin-right: auto; margin-left: auto; width: 75%;" /><hr style="margin-right: auto; margin-left: auto; width: 85%;" /><hr style="margin-right: auto; margin-left: auto; width: 90%;" /><hr style="margin-right: auto; margin-left: auto; width: 60%;" /></span>',
				hotkeys: ['Alt+C', 'Ctrl+E']
			},
			justifyright: {
				title: 'Align Right',
				button: '<span style="position: relative; display: block; width: 1em; margin: .2em auto;"><hr style="float: right; width: 100%;" /><hr style="float: right; width: 90%;" /><hr style="float: right; width: 75%;" /><hr style="float: right; width: 85%;" /><hr style="float: right; width: 90%;" /><hr style="float: right; width: 60%;" /></span>',
				hotkeys: ['Alt+R', 'Ctrl+R']
			},
			justifyfull: {
				title: 'Justify',
				button: '<span style="position: relative; display: block; width: 1em; margin: .2em auto;"><hr style="float: left; width: 100%;" /><hr style="float: left; width: 100%;" /><hr style="float: left; width: 100%;" /><hr style="float: left; width: 100%;" /><hr style="float: left; width: 100%;" /><hr style="float: left; width: 70%;" /></span>',
				hotkeys: ['Alt+J', 'Ctrl+J']
			},
			indent: {
				title: 'Indent',
				button: '<span style="position: relative; font: 1.3em Georgia; top: -.07em;">&#8649;&para;</span>',
				hotkeys: ['Ctrl+M']
			},
			outdent: {
				title: 'Unindent',
				button: '<span style="position: relative; font: 1.3em Georgia; top: -.07em;">&#8647;&para;</span>',
				hotkeys: ['Ctrl+Shift+M']
			},
			removeformat: {
				title: 'Unformat',
				button: '<span style="font: bold 1em Arial; padding-right: .2em;">&#8416;</span>',
				hotkeys: ['Ctrl+Alt+0']
			},
			increasefontsize: {
				title: 'Increase Size',
				button: '<span style="position: relative; display: block; float: left; width: 1.5em; left: -.1em; letter-spacing: -.23em"><span style="font: .8em Arial;">A</span><span style="font: bold 1.1em Arial;">A</span></span>',
				hotkeys: ['Ctrl+Shift+>']
			},
			decreasefontsize: {
				title: 'Decrease Size',
				button: '<span style="position: relative; display: block; float: left; width: 1.5em; left: -.1em;letter-spacing: -.23em"><span style="font: 1.1em Arial;">A</span><span style="font: bold .8em Arial;">A</span></span>',
				hotkeys: ['Ctrl+Shift+<']
			},
			superscript: {
				title: 'Superscript',
				button: '<span style="position: relative; display: block; float:left; height: 1em; width: 2em;"><span style="position: absolute; display: block; bottom: -.7em; font: 1em Verdana;">&#11016;</span><span style="position: absolute; display: block; top: -.3em; font: .8em Arial;">sup</span></span>',
				hotkeys: ['Ctrl+Shift+^']
			},
			subscript: {
				title: 'Subscript',
				button: '<span style="position: relative; display: block; float:left; height: 1em; width: 2em;"><span style="position: absolute; display: block; top: -.3em; font: 1em Verdana;">&#11018;</span><span style="position: absolute; display: block; bottom: -.7em; font: .8em Arial;">sub</span></span>',
				hotkeys: ['Ctrl+Shift+*']
			},
			cut: {
				title: 'Cut',
				button: '<span style="font: normal 1.1em Georgia; top: -1px;">&#9985;</span>',
				hotkeys: ['Ctrl+X', 'Shift+Del']
			},
			copy: {
				title: 'Copy',
				button: '<span style="font: normal 1.2em Georgia; top: -1px;">&#9112;</span>',
				hotkeys: ['Ctrl+C', 'Ctrl+Ins']
			},
			paste: {
				title: 'Paste',
				button: '<span style="font: normal 1.2em Georgia; top: -1px;">&#9094;</span>',
				hotkeys: ['Ctrl+V', 'Shift+Ins']
			},
			undo: {
				title: 'Undo',
				button: '<span style="font: normal 1.2em Georgia; top: -1px;">&#8630;</span>',
				hotkeys: ['Ctrl+Z']
			},
			redo: {
				title: 'Redo',
				button: '<span style="font: normal 1.2em Georgia; top: -1px;">&#8631;</span>',
				hotkeys: ['Ctrl+Shift+Z','Ctrl+Y']
			},
			removeformat: {
				title: 'Unformat',
				button: '<span style="font: bold 1.1em Arial;">&#8709;</span>',
				hotkeys: ['Ctrl+f']
			},
			insertlink: {
				title: 'Insert Hyperlink',
				button: '<span style="font: .85em Arial;text-decoration: underline;">LINK</span>',
				form: '<div><label for="link">Link</label><input type="text" name="link" /></div><div><label for="title">Title</label><input type="text" name="title" /></div>',
				init: function(id, $form) {
					var $bius = __getBius(id);
					var $iframe = $bius.find('.bius_frame');
					var sel = __getSelect($iframe);
					if (!sel)
						return;
					$form.find('input[name=title]').val(sel);
				},
				submit: function(id, $form) {
					act = $form.attr('action');
					link = $form.find('[name=link]').val();
					title = $form.find('[name=title]').val();
					alert(act + ' ' + link + ' (' + title +')');
					return true;
				},
				hotkeys: ['Ctrl+E']
			},
			insertvideo: {
				title: 'Insert Video',
				button: '<span style="font: bold 1.2em Georgia;">&#57368;</span>',
				form: '<div><label for="link">Link</label><input type="text" name="link" /></div><div><label for="title">Title</label><input type="text" name="title" /></div>',
				action: function(id, value) {
				},
				hotkeys: ['Ctrl+Alt+V']
			},
			insertorderedlist: {
				title: 'Number List',
				button: '<span style="position: relative; display: block; float: left; width: 1em; height: 1em; margin: .2em .3em;"><span style="position: relative; display: block; float: left; width: 0; top: -.4em; left: -.2em; font: .5em Arial;">1</span><hr style="float: left; position: relative; width: 75%; left: .3em;" /><hr style="float: left; position: relative; width: 70%; left: .3em; margin-bottom: .3em" /><span style="position: relative; display: block; clear: left; float: left; width: 0; top: -.4em; left: -.2em; font: .5em Arial;">2</span><hr style="float: left; position: relative; width: 75%; left: .3em;" /><hr style="float: left; position: relative; width: 70%; left: .3em;" /></span>',
				hotkeys: ['Ctrl+\'', 'Ctrl+Shift+N']
			},
			insertunorderedlist: {
				title: 'Bullet List',
				button: '<span style="position: relative; display: block; float: left; width: 1em; height: 1em; margin: .2em .2em;"><span style="position: relative; display: block; float: left; width: 0; top: -.4em; left: -.1em; font: .5em Arial;">&bull;</span><hr style="float: left; position: relative; width: 75%; left: .3em;" /><hr style="float: left; position: relative; width: 70%; left: .3em; margin-bottom: .3em" /><span style="position: relative; display: block; clear: left; float: left; width: 0; top: -.4em; left: -.1em; font: .5em Arial;">&bull;</span><hr style="float: left; position: relative; width: 75%; left: .3em;" /><hr style="float: left; position: relative; width: 70%; left: .3em;" /></span>',
				hotkeys: ['Ctrl+:', 'Ctrl+Shift+L']
			},
			inserthorizontalrule: {
				title: 'Horizontal Line',
				button: '<span style="font-size: 1.1em">&#10231;</span>',
				hotkeys: ['Ctrl+H']
			},
			unbius: {
				title: 'Save & Exit',
				button: '<span style="font: bold 1.1em Arial;">&#9166;</span>',
				action: function(id, value) {
					return $('#bius_editor_' + id).unbius();
				},
				hotkeys: ['Ctrl+S', 'Ctrl+Return']
			},
			rebius: {
				title: 'Reload Text',
				button: '<span style="font: bold 1.1em Arial;">&#10226;</span>',
				action: function(id, value) {
					return $('#bius_editor_' + id).rebius(value);
				}
			},
			savebius: {
				title: 'Save Draft',
				button: '<span style="font: bold 1.1em Arial;">&#57865;</span>',
				action: function(id, value) {
					var $obj = __getBius(id);
					var $source = $obj.find('.bius_source');
					var $iframe = $obj.find('.bius_frame');
					if($iframe[0])
						$iframe = $($iframe[0].contentWindow.document).find('body');
					if($source.is('textarea, input'))
						$source.val(__cleanHTML($iframe.html()));
					else
						$source.html(__cleanHTML($iframe.html()));
				},
				hotkeys: ['Ctrl+S', 'Ctrl+Shift+S']
			},
			exitbius: {
				title: 'Exit Editor',
				button: '<span style="font: bold 1.1em Arial;">&#9167;</span>',
				action: function(id, value) {
					return $('#bius_editor_' + id).unbius(null, true);
				},
				hotkeys: ['Ctrl+Return']
			},
			editcode: {
				title: 'Edit Code',
				button: '<span style="font: bold 1.2em Arial; top: -.2em;">&lt;/&gt;</span>',
				action: function(id, value) {
					var $bius = $('#bius_editor_' + id);
					var $button = $('#bius_button_' + id + '_editcode')
					var $iframe = $bius.find('.bius_frame');
					if($iframe[0])
						var idoc = $iframe[0].contentWindow.document;
					else
						return;
					var $ibody = $(idoc).find('body');
					$ibody.find('.bius_panel').remove();
					var $source = $ibody.find('#bius_source');
					if($source[0]) {
						$bius.rebius($source[0].value);
						$button.removeClass('bius_select');
					} else {
						$bius.rebius('<textarea id="bius_source" style="position: absolute; top: 0; left: 0; bottom: 0; right: 0; border: none; outline: none !important;">' + __cleanHTML($ibody.html()) + '</textarea>');
						$button.addClass('bius_select');
					}
				},
				test: function(id, idoc) {
					var $ibody = $(idoc).find('body');
					var $source = $ibody.find('#bius_source');
					if($source[0])
						return true;
					return false;
				},
				hotkeys: ['Ctrl+Return']
			}
		},
		load: function(obj) {
			if(!obj) obj = document;
			var r = $(obj).find('[bius]').bius().each(function(){
					var id = $(this).attr('bius');
					$('#bius_frame_' + id).focus();
			}).length;
			return r > 0;
		},
		unload: function(obj) {
			if(!obj) obj = document;
			var r = $(obj).unbius().length;
			return r > 0;
		},
		command: function(id, act, value) {
			var r = $(document).biusCommand(id, act, value).length;
			return r > 0;
		},
		poll: function(id, act) {
			var r = $(document).biusPoll(id, act).length;
			return r > 0;
		}
	});
	// Prototype Methods
	$.fn.extend({
		bius: function(id, buttons, contents) {
			if(typeof id == 'function')
				return this.each(function() {
					this.onbius = id;
				});
			if(!contents) {
				contents = buttons;
				buttons = id;
				id = 'bius';
			}
			if(!buttons) buttons = $.bius.buttons;
			if(!__idarr[id]) __idarr[id] = 0;
			return this.not('.bius_editor, .bius_source').each(function() {
				var $source = $(this);
				id = $source.attr('bius')? $source.attr('bius') : id + (__idarr[id]++);
				var actions = $source.attr('buttons')? $source.attr('buttons') : buttons;
				var text = contents? contents : $source.is('textarea, input')? $source.val() : $source.html();
				if(!text.length) text = '<p></p>';
				var style = $source.attr('style')?  $source.attr('style') + '; ' : '';
				var $editor = $source.addClass('bius_source').wrap('<div class="bius_editor" id="bius_editor_' + id + '" bius="' + id + '" style="position:relative; width: 33em; ' + style + '"></div>').parent();
				var $iframe = $('<iframe style="z-index: 100;" class="bius_frame" id="bius_frame_' + id + '" />').insertBefore($source).hide();
				__editorContent($iframe, text, $source.attr('stylesheet'));
				if(__biusEvent($source, 'onbius')) {
					__editorEnable($iframe, true, function() {
						$source.hide();
						$iframe.show();
						$toolbar = $('<div class="bius_toolbar" style="border: 1px red;"></div>').insertBefore($iframe).hide();
						__populateToolbar(id, $iframe, $toolbar, actions);
						$toolbar.show();
						$toolbar.find('.bius_menu button').bind('click', function(){
							$toolbar.find('.bius_menu').hide();
						});
						__activateHotkeys(id, $iframe, actions);
					});
				} else {
					$source.insertAfter($editor).removeClass('bius_source');
					$editor.remove();
				}
			});
		},
		rebius: function(id, contents) {
			if(typeof id == 'function')
				return this.each(function() {
					this.onrebius = id;
				});
			if(!contents) {
				contents = id;
				id = null;
			}
			return this.each(function() {
				__getBius(id, this).each(function() {
					var $iframe = $(this).find('.bius_frame:first');
					var $source = $(this).find('.bius_source:first');
					if(!__biusEvent($source, 'onrebius'))
						return;
					var text = contents? contents : $source.is('textarea, input')? $source.val() : $source.html();
					if(!text.length) text = '<p></p>';
					__editorContent($iframe, text, $source.attr('stylesheet'));
					__editorEnable($iframe, true);
				});
			});
		},
		unbius: function(id, nosave) {
			if(typeof id == 'function')
				return this.each(function() {
					this.onunbius = id;
				});
			return this.each(function() {
				__getBius(id, this).each(function() {
					var $source = $(this).find('.bius_source');
					var $iframe = $(this).find('.bius_frame');
					if($iframe[0])
						$iframe = $($iframe[0].contentWindow.document).find('body');
					if(!nosave)
						if($source.is('textarea, input'))
							$source.val($(this).biusHTML());
						else
							$source.html($(this).biusHTML());
					if(__biusEvent($source, 'onunbius')) {
						$source.insertAfter(this).show().removeClass('bius_source').focus();
						$(this).remove();
					} else {
						$iframe.focus();
					}
				});
			});
		},
		biusCommand: function(id, act, value) {
			if(value === null) {
				value = act;
				act = id;
				id = null;
			}
			var actions = $.bius.actions;
			if(actions[act] && actions[act].form)
				return this.biusForm(id, act, value);
			this.each(function() {
				__getBius(id, this).each(function() {
					var $source = $(this).find('.bius_source');
					var $iframe = $(this).find('.bius_frame');
					var idoc = $iframe[0].contentWindow.document;
					if(actions[act] && actions[act].action)
						return actions[act].action(id, value);
					else
						return __try(function() { return idoc.execCommand(act, false, value); });
				}).focus();
			});
			return this;
		},
		biusForm: function(id, act, values) {
			if(values === null) {
				values = {};
			}
			if(act === null) {
				act = id;
				id = null;
			}
			if($.bius.actions[act] && $.bius.actions[act].form)
				action = $.bius.actions[act];
			else
				return;
			action['id'] = act;
			this.each(function() {
				__getBius(id, this).each(function() {
					var $bius = $(this);
					var $toolbar = $(this).find('.bius_toolbar');
					var color = $toolbar.find('button:first').css('color');
					var font = $toolbar.find('button:first').css('font-family');
					var bgcolor = $toolbar.find('.bius_menu:first').css('background-color');
					var $iframe = $bius.find('.bius_frame');
					__editorEnable($iframe, false);
					var idoc = $iframe[0].contentWindow.document;
					var $ibody = $(idoc).find('body');
					var $panel = $bius.find('.bius_panel');
					var panel_id = $panel.attr('id');
					$panel.remove();
					if (panel_id == act)
						return;
					var $form = $('<div id="' + act + '" class="bius_panel" style="position: relative;  width: 100%; z-index: 200;">' +
						'<form id="bius_panel_form" style="position: absolute; top: 0; right: 0; left: 0; border: 1px outset; color: ' + color + '; background: ' + bgcolor + '; font-size: 1em; padding: 1.6em .2em .2em 5.2em; margin: 1em;">' +
						'<style>' +
						'#bius_panel_title:before { content: \'\\22B8 \'; font-size: 1.8em; position: relative; top: .15em; }' +
						'div { font: 1em ' + font + '; padding: .2em; }' +
						'label { display: block; float: left; font: .8em ' + font + '; padding: 0 1.2em 0 0; width: 15%; text-align: right; }' +
						'input { border: 1px inset; width: 75%; }' +
						'button { border: none; color: ' + color + '; background: ' + bgcolor + '; }' +
						'button:hover { color: ' + bgcolor + '; background: ' + color + '; }' +
						'</style>' +
						'<div id="bius_panel_icon" style="position: absolute; top: 0; left: 0; bottom: 0; width: 2em; text-align: center; background: ' + color + '; color: ' + bgcolor + '; font-size: 1.5em; padding: .5em; overflow: hidden;">' + action.button + '</div>' +
						'<div id="bius_panel_title" style="position: absolute; top: -.5em; left: 6em; font: bold .7em ' + font + '; letter-spacing: .7em;">' + action.title + '</div>' +
						action.form +
						'<div style="text-align: right;"><button name="act" type="submit" value="ok">&#10004; Ok</button><button name="act" type="submit" value="cancel">&#10008; Cancel</button></div>' +
						'</form>' +
					'</div>').insertBefore($iframe);
					$form.css('opacity', 0.9);
					$form.bind('submit', function(){
						if(action.submit(id, $form))
							$form.remove();
						return false;
					});
					$form.find('button[type=submit]').bind('click', function(){
						$form.attr('action', this.value);
					});
				});
			});
			return this;
		},
		biusHTML: function(id) {
			var html = [];
			__getBius(id, this).each(function() {
				var $iframe = $(this).find('.bius_frame');
				if($iframe[0])
					$iframe = $($iframe[0].contentWindow.document).find('body');
				var $source = $iframe.find('#bius_source');
				html[html.length] = $source[0]? $source[0].value : __cleanHTML($iframe.html());
			});
			console.log(html);
			return html;
		},
		biusPoll: function(id, action) {
		},
		biusRange: function(id) {
		}
	});
	// Initialization Function
	$(function() {
		$.bius.load();
		$('head').append('<style>' +
			'.bius_frame { position: relative; display: block; border: 1px inset; clear: left; width: 100%; }' +
			'.bius_toolbar button { display: inline; float: left; min-width: 1.8em; height: 2.1em; padding: .2em .1em; overflow: hidden; }' +
			'.bius_toolbar button hr { margin: 0 0 .1em; border: none; height: 1px; }' +
			'.bius_toolbar hr.spacer { display: inline; float:left; width: .1em; height: .9em; margin: .4em; border: none; }' +
			'.bius_menu_place { position:relative; float: left; z-index: 100000 }' +
			'.bius_menu { position: absolute; display: none; top: 1.5em; left: 0; background: #ffe; }' +
			'.bius_menu button { display: block; float: none; text-align: justify; width: 100%; height: 2.1em; margin: 0; padding: .2em .3em; white-space: nowrap; overflow: hidden; }' +
			'.bius_menu button:after { content: " " attr(act); }' +
			'.bius_menu hr.spacer { display: block; float:none; width: 100%; height: 1px; margin: 0; border: none; }' +
			'.bius_menu .bius_menu_place { float: right; }' +
			'.bius_menu .bius_menu { top: .3em; left: -.3em; }' +
			'.bius_menu .bius_menu_button:after { content: " " attr(act) " \\E313"; }' +
			'</style>');
	});
})(jQuery);
