
@@include('./codemirror.js')
@@include('./javascript.js')
@@include('./raf.js')

(function(window, document) {
	'use strict';

	var cm = {
		editors: {},
		labs: {},
		types: {
			js: 'text/javascript'
		},
		gutterOptions: ['CodeMirror-linenumbers'],
		extraKeys: {
			'Alt-Enter': function(editor) {
				jupyter.sandbox(editor);
			}
		}
	};

	var jupyter = {
		init: function() {
			// fast references
			this.body = document.querySelector('body');

			// bind handlers
			this.body.addEventListener('click', this.doEvent)
			//this.body.on('click', '[data-cmd]', this.doEvent);

			// default tasks
			this.doEvent('init-editors');
		},
		doEvent: function(event, el, orgEvent) {
			var self = jupyter,
				cmd  = (typeof(event) === 'string') ? event : event.type,
				wrapper,
				sidebar,
				index,
				code,
				srcEl;
			//console.log(cmd);
			switch(cmd) {
      			// native events
      			case 'click':
      				srcEl = event.target;
      				cmd = srcEl.getAttribute('data-cmd');
      				if (!cmd) return;
      				// prevent default behaviour
					event.stopPropagation();
					event.preventDefault();

					return self.doEvent(cmd, srcEl, event);
      			// custom events
				case 'init-editors':
					document.querySelectorAll('pre > code').forEach(function(item, index) {
						if (item.firstChild.innerHTML !== '/* jupyter:active */') return;
						var _cm = cm,
							language = item.className.split('-')[1],
							code = item.textContent.split('\n').slice(1),
							cmOptions = {
						        mode: _cm.types[language],
						        gutters: _cm.gutterOptions,
								extraKeys: _cm.extraKeys,
								lineWrapping: false,
								lineNumbers: true
							},
							textarea,
							editor;
						code.unshift(code.pop());
						item.setAttribute('data-editor_index', index);
						item.classList.add('active');
						item.innerHTML = '<textarea>'+ code.join('\n') +'</textarea>'+
								'<div data-cmd="active-play-toggle"></div>'+
								'<sidebar><div class="rows"></div></sidebar>';
						textarea = item.querySelector('textarea');
						editor = CodeMirror.fromTextArea(textarea, cmOptions);
						/*
						editor.on('blur', function(event) {
								var el = $(event.display.wrapper).parents('pre');
								el.removeClass('active');
								jupyter.body.removeClass('editor-focus');
							});
						editor.on('focus', function(event) {
								var el = $(event.display.wrapper).parents('pre');
								el.addClass('active');
								jupyter.body.addClass('editor-focus');
							});
						*/
						_cm.editors[index] = editor;

						//if (index === 1) jupyter.sandbox(editor);
						//console.log(index, editor.getValue());
					});
					break;
				case 'explore-arguments':
					//var tmp = el.attr('data-editor_index').split(',');
					//console.log( cm.labs[tmp[0]] );
					break;
				case 'active-play-toggle':
					wrapper = el.parentNode;
					index = wrapper.getAttribute('data-editor_index');
					if (cm.labs[index]) {
						cm.labs[index].stop(index);
						wrapper.classList.remove('sandbox-on');
					} else {
						jupyter.sandbox(cm.editors[index]);
					}
					sidebar = wrapper.querySelector('sidebar');
					cm.editors[index].setSize(wrapper.offsetWidth - (sidebar.offsetWidth ? sidebar.offsetWidth - 1 : 2));
					cm.editors[index].refresh();
					break;
			}
		},
		sandbox: function(editor) {
			var code = editor.getValue(),
				wrapper = editor.display.wrapper.parentNode,
				editor_index = wrapper.getAttribute('data-editor_index'),
				sidebar = wrapper.querySelector('sidebar .rows'),
				labs = {
					view: function(line, options) {
						var span = document.createElement('span'),
							el = sidebar.querySelector('div.view.stdOut.line-'+ line),
							height = editor.defaultTextHeight(),
							style = [],
							key, htm;
						if (!el) {
							style.push('top: '+ (((line - 1) * height) + 3) +'px');
							if (typeof options === 'object') {
								for (key in options) {
									switch (key) {
										case 'width': continue;
										case 'height': style.push(key +': '+ options[key] +'px'); break;
									}
								}
							}
							htm = '<div class="stdOut view line-'+ line +'" style="'+ style.join('; ') +';"></div>';
							span.innerHTML = htm;
							el = sidebar.appendChild(span.firstChild);
						}
						return {
							el: el,
							width: el.offsetWidth - 2,
							height: el.offsetHeight - 2
						};
					},
					table: function(line) {
						var span = document.createElement('span'),
							args = [].slice.call(arguments).slice(1),
							el = sidebar.querySelector('div.stdOut.line-'+ line),
							height = editor.defaultTextHeight(),
							style = [],
							content = [],
							key,
							htm;
						if (!el) {
							style.push('top: '+ (((line - 1) * height) + 3) +'px');
							htm = '<div class="stdOut table line-'+ line +'" style="'+ style.join('; ') +';"></div>';
							span.innerHTML = htm;
							el = sidebar.appendChild(span.firstChild);
						}
						content.push('<table>');
						content.push('<tr><th>(index)</th><th>Value</th></tr>');
						
						Object.keys(args[0]).map(function(item, index) {
							content.push('<tr><td>'+ item +'</td><td>'+ args[0][item] +'</td></tr>');
						});

						content.push('</table>');
						el.innerHTML = content.join('');

						// forward to real console
						window.console.table.apply({}, args);
					},
					log: function(line) {
						var span = document.createElement('span'),
							args = [].slice.call(arguments).slice(1),
							el = sidebar.querySelector('div.stdOut.line-'+ line),
							height = editor.defaultTextHeight(),
							style = [],
							htm;
						if (!el) {
							style.push('height: '+ (height + 1) +'px');
							style.push('top: '+ (((line - 1) * height) + 3) +'px');
							htm = '<div class="stdOut line-'+ line +'" style="'+ style.join('; ') +';"></div>';
							span.innerHTML = htm;
							el = sidebar.appendChild(span.firstChild);
						}
						el.classList.remove('ping');
						// forward to real console
						window.console.log.apply({}, args);
						requestAnimationFrame(function() {
							var content = args.map(function(item, index) {
									if (!item) return 'undefined';
									switch (item.constructor) {
										case Number:
										case String:   return item;
										case Array:    return '<span data-cmd="explore-arguments" data-editor_index="'+ editor_index +','+ index +'">'+ JSON.stringify(item) +'</span>';
										case Object:   return '<span data-cmd="explore-arguments" data-editor_index="'+ editor_index +','+ index +'">'+ JSON.stringify(item) +'</span>';
										case Function: return '<span data-cmd="explore-arguments" data-editor_index="'+ editor_index +','+ index +'">Function</span>';
									}
									return '<span data-cmd="explore-arguments" data-index="'+ editor_index +','+ index +'">'+ (typeof item) +'</span>';
								});
							// update log line
							el.classList.add('ping');
							el.innerHTML = content.join(',');
						});
					},
					fetchScript: function(url) {
						return new Promise(function(resolve, reject) {
							fetch(url +'?'+ Math.random())
								.then(function(resp) {return resp.text();})
						    	.then(function(code) {
						    		var str = 'return (function() {var module={};'+ code +'; return module.exports;})();';
					    			return new Function(str).call();
						    	})
						    	.then(function(data) {return resolve(data)})
						    	.catch(function(error) {return reject(error)});
						});
					},
					fetchJSON: function(url) {
						return new Promise(function(resolve, reject) {
							fetch(url)
						    	.then(function(resp) {return resp.json();})
						    	.then(function(data) {return resolve(data)})
						    	.catch(function(error) {return reject(error)});
						});
					},
					_rafs: [],
					_timeouts: [],
					_intervals: [],
					requestAnimationFrame: function(func) {
						this._rafs.push(requestAnimationFrame(func));
					},
					setTimeout: function(func, time) {
						this._timeouts.push(setTimeout(func, time));
					},
					setInterval: function(func, time) {
						this._intervals.push(setInterval(func, time));
					},
					stop: function(index) {
						this._stopped = true;
						this._rafs.map(function(func) {
							cancelAnimationFrame(func);
						});
						this._intervals.map(function(func) {
							clearInterval(func);
						});
						this._timeouts.map(function(func) {
							clearTimeout(func);
						});
						delete cm.labs[index];
					}
				},
				sandboxed = function(lines) {
					var code = 'var console={log:labs.log, view:labs.view, table:labs.table},'+
							'requestAnimationFrame=labs.requestAnimationFrame.bind(labs),'+
							'setTimeout=labs.setTimeout.bind(labs),'+
							'setInterval=labs.setInterval.bind(labs);'+
							'fetchScript=labs.fetchScript.bind(labs);'+
							'fetchJSON=labs.fetchJSON.bind(labs);'+
					'	(function() {if (labs._stopped) return;'+ lines.join('\n') +'})();';
					(new Function('labs', code).call({}, labs));

					cm.labs[editor_index] = labs;
				},
				lines = code.split('\n'),
				len = lines.length;

			wrapper.classList.add('sandbox-on');
			sidebar.innerHTML = '';

			while (len--) {
				// adjust 'console.log'
				lines[len] = lines[len]
								.replace(/console.view\(/g, 'console.view('+ (len+1) +',')
								.replace(/console.table\(/g, 'console.table('+ (len+1) +',')
								.replace(/console.log\(/g, 'console.log('+ (len+1) +',');
			}
			// eval code in sandbox mode
			sandboxed(lines);
		}
	};

	var fn, init = function() {
			// init object
			jupyter.init();
			// call default onload handler, if any
			if (typeof(fn) === 'function') fn();
		};

	if (document.readyState === 'complete') {
		init();
	} else {
		fn = window.onload;
		window.onload = init;
	}
	
})(window, document);
