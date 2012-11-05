/******************************************************************************************************************************
* @ Original idea by by Binny V A, Original version: 2.00.A
* @ http://www.openjs.com/scripts/events/keyboard_shortcuts/
* @ Original License : BSD
* @ jQuery Plugin by Tzury Bar Yochay
		mail: tzury.by@gmail.com
		blog: evalinux.wordpress.com
		face: facebook.com/profile.php?id=513676303
		(c) Copyrights 2007

* @ jQuery Plugin version Beta (0.0.2)
* @ License: jQuery-License.

TODO:
	add queue support (as in gmail) e.g. 'x' then 'y', etc.
	add mouse + mouse wheel events.

USAGE:
	$.hotkeys.bind('Ctrl+c', function(){ alert('copy anyone?');});
	$.hotkeys.bind('Ctrl+c', {target: 'textarea#editor', type: 'keyup'}, function(){ alert('copy anyone?');});>
	$.hotkeys.unbind('Ctrl+c');
	$.hotkeys.unbind('Ctrl+c', {target: 'iframe#editor', type: 'keypress'});

NOTE: Due to browser limitation only some object can have keyboard events.
Therefore, you  can only add hotkeys to html documents, textareas, inputs,
buttons and select boxes. There is currently no way to bind hotkeys directly
to divs or other block opbject. You must instead use the html document. If
you need to bind hotkeys to a specific region of a webpage use an iframe.

******************************************************************************************************************************/
(function ($){
	// Private Variables and Methods
	__clone = function (obj) {
		if (obj == null || obj.innerHTML || obj.jquery || typeof (obj) != 'object')
			return obj;
		var r = obj.split? [] : {};
		for (var x in obj)
			r[x] = __clone(obj[x]);
		return r;
	};
	// Public Variables and Methods
	$.hotkeys = {
		version: '(alpha)(0.0.5)',
		// all hotkey events
		all: {},
		// default options
		options: {
			type: 'keydown',
			disableInInput: false,
			target: $(document)[0],
			checkParent: true
		},
		// key name to char codes
		keynames: {
			27: 'ESC', 9: 'TAB', 32: 'SPACE', 13: 'RETURN', 8: 'BACKSPACE', 145: 'SCROLL', 20: 'CAPSLOCK',
			144: 'NUMLOCK', 19: 'PAUSE', 45: 'INS', 46: 'DEL', 33: 'PAGEUP', 34: 'PAGEDOWN', 35: 'END',
			36: 'HOME', 37: 'LEFT', 38: 'UP', 39: 'RIGHT', 40: 'DOWN', 112: 'F1', 113: 'F2', 114:'F3',
			115:'F4', 116:'F5', 117:'F6', 118:'F7', 119:'F8', 120:'F9', 121:'F10', 122:'F11', 123:'F12'
		},
		// chars for shift numbers
		// TODO: find a better solution for this
		symbols: {
			'`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&',
			'8': '*', '9': '(', '0': ')', '-': '_', '=': '+', ';': ':', '\'': '"', ',': '<',
			'.': '>', '/': '?', '\\': '|'
		},
		// bind a new set of hotkeys
		bind: function(combi, opt, fn) {
			//if no options spcified
			if ($.isFunction(opt)) {
				fn = opt;
				opt = {};
			}

			//if multiple hotkeys assigned
			if(typeof combi != 'string') {
				for(x in combi) {
					if(isNaN(x))
						$.hotkeys.bind(x, $.extend(opt, {data: $.extend(opt.data, {value: combi[x]})}), fn);
					else
						$.hotkeys.bind(combi[x], opt, fn);
				}
				return;
			}

			//if a jQuery object was sent instead of options
			if(typeof opt == 'string' || opt.jQuery)
				opt = {target: opt};

			//set default options
			opt = $.extend($.hotkeys.options, opt || {});

			// prepare combi in standard format
			combi = combi.toUpperCase().split('+');
			$.extend(combi, {ctrl: '', alt: '', shift: '', key: ''});
			for(key in combi) {
				if(!isNaN(key)) combi['key'] = combi[key];
				switch(combi['key']) {
					case 'META':
					case 'CTRL':
						combi['ctrl'] = navigator.userAgent.indexOf('Mac') < 0? 'CTRL+' : 'META+';
						break;
					case 'ALT':
						combi['alt'] = 'ALT+';
						break;
					case 'SHIFT':
						combi['shift'] = 'SHIFT+';
				}
			}
			combi = combi['ctrl'] + combi['alt'] + combi['shift'] + combi['key'];

			//add hotkeys for each element in target
			return $(opt.target).each(function() {
				var obj = $(this).is('iframe')? this.contentWindow.document : this;
				var target = $.data(obj);

				// Find the intended target
				if (!$.hotkeys.all[target])
					$.hotkeys.all[target] = {events: {}};
				if (!$.hotkeys.all[target].events[opt.type]) {
					$.hotkeys.all[target].events[opt.type] = {combis: {}};
					// Add keystroke listener for this object and event
					$.event.add(obj, opt.type, function(ev) {
						// jQuery event normalization.
						ev= $.event.fix(ev);
						var element = ev.target;
						// @ TextNode -> nodeType == 3
						element = (element.nodeType == 3)? element.parentNode : element;
						var target = $(element);
						// Disable shortcut keys in Input, Textarea fields
						if(opt['disableInInput'] && ( target.is("input") || target.is("textarea")))
							return;
						var code = ev.which;
						var type = ev.type;
						var key = String.fromCharCode(code).toUpperCase();
						var keyname = $.hotkeys.keynames[code];
						// default behaivour
						var combi = null;

						// in opera + safari, the event.target is unpredictable.
						// for example: 'keydown' might be associated with HtmlBodyElement
						// or the element where you last clicked with your mouse.
						if ($.browser.opera || $.browser.safari || opt.checkParent)
							while (!$.hotkeys.all[element] && element.parentNode)
								element = element.parentNode;
						var data = $.data(element);
						var combis = $.hotkeys.all[data].events[type].combis;
						if(!ev.metaKey && !ev.ctrlKey && !ev.altKey && !ev.shiftKey ) {
							// If a single key
							myCombi = combis[keyname] ||  combis[key];
						} else {
							// Else deals with combinaitons (alt|ctrl|shift+anything)
							var modif = '';
							if(ev.metaKey && navigator.userAgent.indexOf('Mac') >= 0) modif += 'META+';
							if(ev.ctrlKey && navigator.userAgent.indexOf('Mac') < 0) modif += 'CTRL+';
							if(ev.altKey) modif += 'ALT+';
							if(ev.shiftKey) modif += 'SHIFT+';
							// modifiers + keyname keys or modifiers + key or modifiers + shift key
							if(combis[modif + keyname])
								combi = modif + keyname;
							else if(combis[modif + key])
								combi = modif + key;
							else if(combis[modif + $.hotkeys.symbols[key]])
								combi = modif + $.hotkeys.symbols[key];
						}
						if(combi) {
							if(window.console && window.console.log)
								console.log({hotkey: combi, target: element, data: combis[combi].data, fn: combis[combi].fn});
							ev.combi = combi;
							ev.data = combis[combi].data;
							if(combis[combi].fn(ev) == false) {
								ev.stopPropagation();
								ev.preventDefault();
								return false;
							}
						}
					});
				}
				// Add the combi data to the hotkeys table
				$.hotkeys.all[target].events[opt.type].combis[combi] =  {
					fn: fn,
					data: opt.data
				};
			});
		},
		// unbind set of hotkeys
		unbind: function(combi, opt) {
			//if multiple hotkeys assigned
			if(typeof combi != 'string') {
				for(x in combi)
					$.hotkeys.unbind(combi[x], opt);
				return;
			}

			opt = opt || {};
			//if a jQuery object was sent instead of options
			if(typeof opt == 'string' || opt.jQuery)
				opt = {target: opt};
			target = $.data(opt.target || $(document)[0]);
			type = opt.type || this.options.type;
			combi = combi.toUpperCase();
			delete this.all[target].events[type].combis[combi];
			return $;
		}
	};
	// Prototype Methods
	$.fn.extend({
		bindHotkeys: function(combi, opt, fn) {
			if ($.isFunction(opt)) {
				fn = opt;
				opt = {};
			}
			if(typeof opt == 'string' || opt.jquery)
				opt = {target: opt};
			var myself = this;
			return this.each(function() {
				var myopt  = __clone(opt);
				if(!myopt.target)
					myopt.target = this;
				else if(!myopt.target.jquery && myopt.target != myself)
					myopt.target = $(this).find(myopt.target);
				$.hotkeys.bind(combi, myopt, fn);
			});
		},
		unbindHotkeys: function(combi, opt, fn) {
			if ($.isFunction(opt)) {
				fn = opt;
				opt = {};
			}
			return this.each(function() {
				opt = $.extend($.hotkeys.options, opt || {});
				opt.target = $(this).find(opt.target);
				$.hotkeys.unbind(combi, opt);
			});
		}
	});
})(jQuery);
