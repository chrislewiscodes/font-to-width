/*
 * FONT-TO-WIDTH FTW 2.0
 *
 * Fits text to the width of an element using variable-font 'wdth' axis or multiple font families of different widths.
 * 
 * Usage: 
 * <element>Text To Fit</element>
 * <script> new FontToWidth({fonts:["List","of","font","families"], elements:"CSS selector for elements"}); </script>
 *
 * Notes:
 * Multiple FontToWidth instances can be created using different font lists and elements.
 * Element can be any block or inline-block element.
 *
 * © 2018 Chris Lewis http://chrislewis.codes and Nick Sherman http://nicksherman.com
 * Freely made available under the MIT license: http://opensource.org/licenses/MIT
 * 
 * CHANGELOG:
 * 2018-10-04 Add maxLetterSpace option
 * 2018-02-05 Remove jQuery dependency; better font load detection; add support for variable fonts
 * 2015-02-28 Allow arbitrary CSS styles for each font
 * 2014-03-31 Initial release: minLetterSpace option; errs on the side of narrow spacing
 *
 */

;(function() {
'use strict';

/**
 * @param  options
 * @param [options.fonts]						A list of font-family names or sets of CSS style parameters.
 * @param [options.variableFont]				A font object as in `options.fonts`, plus optional `axis`, `min`, `max` properties
 * @param [options.elements=".ftw"]			A CSS selector or jQuery object specifying which elements should apply FTW
 * @param [options.maxLetterSpace=none]		Maximum allowed space stretching when font size maxes out
 * @param [options.minLetterSpace=-0.04]	A very small, probably negative number indicating degree of allowed tightening
 * @param [options.minFontSize=1.0]			Allow scaling of font-size. Ratio to original font size.
 * @param [options.maxFontSize=1.0]			Allow scaling of font-size. Ratio to original font size.
 * @param [options.preferredFit="tight"]		Whether to prefer "tight" or "loose" letterspacing
 * @param [options.preferredSize="large"]	Whether to prefer "large" or "small" font-size
 */

var FontToWidth = function(options) {

	// in case we were not called with "new"
	if (!(this instanceof FontToWidth)) {
		return new FontToWidth(options);
	}

	var ftw = this;

	//OPTIONS 
	
	//fill out fonts CSS with default settings
	function normalizedFontObject(font) {
		var result = {};
		if (typeof font == "string") {
			font = {fontFamily: font};
		}
		result.fontFamily = font.fontFamily || font['font-family'];
		if (!result.fontFamily) {
			throw "Invalid font object";
		}
		if (result.fontFamily.indexOf(' ') >= 0 && !result.fontFamily.match(/^['"]/)) {
			result.fontFamily = '"' + result.fontFamily + '"';
		}
		result.fontWeight = font['font-weight'] || font.fontWeight || 'normal';
		result.fontStyle = font['font-style'] || font.fontStyle || 'normal';
		result.fontStretch = font['font-stretch'] || font.fontStretch || 'normal';

		return result;
	}

	var browserSupportsVarFonts = typeof document.createElement('span').style.fontVariationSettings === 'string';
	
	if (options.variableFont) {
		if (browserSupportsVarFonts) {
			ftw.mode = 'variable';
			options.fonts = [normalizedFontObject(options.variableFont)];
			options.axis = options.variableFont.axis || 'wdth';
			options.axisMin = isNaN(parseFloat(options.variableFont.min)) ? 1 : options.variableFont.min;
			options.axisMax = isNaN(parseFloat(options.variableFont.max)) ? 1000 : options.variableFont.max;
		} else {
			console.log("FontToWidth warning: variable mode specified, but this browser does not suport variable fonts");
			if (!options.fonts) {
				options.fonts = [options.variableFont];
			}
		}
	}
	
	if (options.fonts) {
		ftw.mode = ftw.mode || 'fonts';
		options.fonts.forEach(function(font, i) {
			options.fonts[i] = normalizedFontObject(font);
		});
	} else {
		ftw.mode = "scale";
		options.fonts = [ false ];
	}

	options.elements = options.elements || '.ftw, .font-to-width, .fonttowidth';
	options.minLetterSpace = typeof options.minLetterSpace === "number" ? options.minLetterSpace : -0.04;
	options.minFontSize = options.minFontSize || (ftw.mode == "scale" ? 0.01 : 1.0);
	options.maxFontSize = options.maxFontSize || (ftw.mode == "scale" ? 100 : 1.0);
	options.preferredFit = options.preferredFit || "tight";
	options.preferredFit = options.preferredSize || "large";

	ftw.measuringText = 'AVAWJ wimper QUILT jousting';
	ftw.initialized = false;
	ftw.ready = false;
	ftw.options = options;
	ftw.fontwidths = new Array(options.fonts.length);
	
	if (window.jQuery && options.elements instanceof jQuery) {
		ftw.allTheElements = options.elements.get();
	} else if (typeof options.elements === 'string') {
		ftw.allTheElements = document.querySelectorAll(options.elements);
	} else {
		ftw.allTheElements = options.elements;
	}

	ftw.allTheElements.forEach(function(el) {
		el.style.whiteSpace = 'nowrap';
		el.setAttribute('data-ftw-original-style', el.getAttribute('style'));
		
		//wrap element contents in a single span
		var span = document.createElement('span');
		span.style.display = 'inline !important';
		el.childNodes.forEach(function(node) {
			span.appendChild(node);
		});
		el.appendChild(span);
	});

	doOnReady(ftw.measureFonts, ftw);
};

FontToWidth.prototype.measureFonts = function() {
	var ftw = this;
	ftw.ready = false;

	if (ftw.mode == "scale") {
		ftw.ready = true;
		ftw.startTheBallRolling();
		return;
	}

	//create a hidden element to measure the relative widths of all the fonts
	var div = ftw.measure_div = document.createElement('div');
	div.style.position = 'absolute';
	div.style.top = '0px';
	div.style.right = '101%';
	div.style.display = 'block';
	div.style.whiteSpace = 'nowrap';

	//add all the measure elements first
	var spans = [];
	ftw.options.fonts.forEach(function(font, i) {
		var span = document.createElement('span');
		span.style.outline = '1px solid green';
		span.style.fontSize = '36px';
		span.style.display = 'inline';
		Object.keys(font).forEach(function(k) {
			span.style[k] = font[k];
		});
		span.textContent = ftw.measuringText;

		div.appendChild(span);
		div.appendChild(document.createElement("br"));

		spans.push(span);
	});
	
	document.body.appendChild(div);

	var fontsloaded = function() {

		ftw.ready = true;

		if (ftw.options.fonts.length > 1) {
			spans.forEach(function(span, i) {
				ftw.fontwidths[i] = span.getBoundingClientRect().width;
			});
	
			//sort the font list widest first
			var font2width = new Array(ftw.options.fonts.length);
			ftw.fontwidths.forEach(function(mywidth, i) {
				font2width[i] = {index: i, width: mywidth};
			});
	
			font2width.sort(function(b,a) { 
				if (a.width < b.width)
					return -1;
				if (a.width > b.width)
					return 1;
				return 0;
			});
	
			var newfonts = new Array(font2width.length);
			font2width.forEach(function(font, i) {
				newfonts[i] = ftw.options.fonts[font.index];
			});
	
			ftw.options.fonts = newfonts;
		}

		ftw.measure_div.parentNode.removeChild(ftw.measure_div);
		
		ftw.startTheBallRolling();
		
	};

	// use CSS font loading API if it's available
	// otherwise load up font face observer
	if (document.fonts && 'ready' in document.fonts) {
		document.fonts.ready.then(fontsloaded);
	} else {
		var ffos = [];
		ftw.options.fonts.forEach(function(font) {
			ffos.push((new FontFaceObserver(font.fontFamily.replace(/"/g, ''), {
				style: font.fontStyle,
				weight: font.fontWeight,
				stretch: font.fontStretch
			})).load());
		});
		Promise.all(ffos).then(fontsloaded);
	}
};

FontToWidth.prototype.startTheBallRolling = function() {
	var ftw = this;

	//only do this stuff once
	if (ftw.initialized)
		return;
		
	ftw.initialized = true;
	
	var updatewidths = ftw.updateWidths.bind(ftw);
	
	//update widths right now
	doOnReady(updatewidths);
	
	//update widths on window load and resize (delayed)
	var resizetimeout;
	window.addEventListener('load', updatewidths);
	window.addEventListener('resize', function() { 
		if (resizetimeout) 
			clearTimeout(resizetimeout);
		resizetimeout = setTimeout(updatewidths, 250);
	});

	//update on live text change
	/*
	ftw.allTheElements.forEach(function(el) { el.addEventListener('keyup',function() {
		//similar to updateWidths() below, but different enough to implement separately
		this.removeClass('ftw_done');
		
		var i, fontfamily;
		for (i in ftw.options.fonts) { 
			fontfamily = ftw.options.fonts[i];
	
			cell.style.fontFamily = fontfamily;
			cell.style.letterSpacing = '';
			ftw.updateSingleWidth(cell);
			if (cell.hasClass('ftw_done')) {
				break;
			}
		}
	});
	*/
};

FontToWidth.prototype.updateWidths = function() {
	var ftw = this;
	
	if (!ftw.ready) return;
	
	function getContentWidth(cell) {
		var styles = getComputedStyle(cell);
		return cell.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
	}
	
	ftw.options.avgFontSize = (ftw.options.maxFontSize + ftw.options.minFontSize)/2;
	
	var starttime = Date.now();
	
	ftw.ready = false;

	//doing this in waves is much faster, since we update all the fonts at once, then do only one repaint per font
	// as opposed to one repaint for every element

	ftw.stillToDo = ftw.allTheElements;
	ftw.stillToDo.forEach(function(el) { el.removeClass('ftw_done ftw_final ftw_onemore'); });

	var fvsRE = window.re = new RegExp('(,/s*)?[\'"]' + ftw.options.axis + '[\'"] [\\-\\d\\.]+', 'g');
	function updateFVS(el, val) {
		el.style.fontVariationSettings = el.style.fontVariationSettings.replace(fvsRE, '"' + ftw.options.axis + '" ' + val);
		el.setAttribute('data-axis-val', val);
	}

	if (ftw.mode === 'variable') {
		var winheight = document.documentElement.clientHeight;
		
		var onscreen = [], offscreen = [];
		
		//reset elements to their original inline css, if any
		ftw.allTheElements.forEach(function(el) { 
			el.style.cssText = el.getAttribute('data-ftw-original-style');
			var bbox = el.getBoundingClientRect();
			var info = {
				'el': el,
				'val': el.hasAttribute('data-axis-val') ? parseFloat(el.getAttribute('data-axis-val')) : (ftw.options.axisMin + ftw.options.axisMax)/2,
				'min': ftw.options.axisMin,
				'max': ftw.options.axisMax,
				'mille': (ftw.options.axisMax-ftw.options.axisMin)/1000,
				'done': false
			};
			
			if (bbox.top < winheight && bbox.bottom > 0) {
				onscreen.push(info);
			} else {
				offscreen.push(info);
			}
		});

		var doEverything = function(elements) {
			var newFVS = [];
			//pre-set variable axis to its former value, or the middle for the first run
			elements.forEach(function(info, i) { 
				var currentStyle = getComputedStyle(info.el).fontVariationSettings;
				var axisString = '"' + ftw.options.axis + '" ' + info.val;
				newFVS.push(currentStyle.length && currentStyle !== 'normal' ? currentStyle + ", " + axisString : axisString);
			});
			
			elements.forEach(function(info, i) { 
				info.el.style.fontVariationSettings = newFVS[i];
			});
			
			//now we go through waves of setting values and then measuring widths
			var tries = 20, anyLeft = elements.length;
			
			while (anyLeft && tries--) {
				//update
				var start = Date.now();
				elements.forEach(function(info) {
					if (info.done) return;
					updateFVS(info.el, info.val);
				});
	
				//measure
				elements.forEach(function(info, i) {
					if (info.done) return;
					var span = info.el.firstElementChild;
						
					var fullwidth = getContentWidth(info.el);
					var textwidth = span.getBoundingClientRect().width;
			
					if (info.val < info.min + info.mille) {
						info.val = info.min;
						info.done = true;
						adjustFontSizeAndLetterSpacing(info.el);
						--anyLeft;
					} else if (info.val > info.max - info.mille) {
						info.val = info.max;
						info.done = true;
						adjustFontSizeAndLetterSpacing(info.el);
						--anyLeft;
					} else if (Math.abs(fullwidth-textwidth) <= 1) {
						info.done = true;
						--anyLeft;
						return;
					} else if (!isNaN(info.previous) && Math.abs(info.val - info.previous) < info.mille) {
						info.done = true;
						--anyLeft;
						return;
					}
	
					if (fullwidth > textwidth) {
						info.min = info.val;
					} else {
						info.max = info.val;
					}
					
					info.previous = info.val;
					info.val = (info.min + info.max)/2;
				});
				var end = Date.now();
				//console.log(tries, anyLeft, (end-start)/1000);
			}
		};
		
		//console.log("onscreen");
		doEverything(onscreen);
		setTimeout(function() { 
			//console.log("offscreen"); 
			doEverything(offscreen); 
		}, 100);
	} else {
		//ftw.fonts is sorted widest first; once we get to a font that fits, we remove that element from the list
		try {
		ftw.options.fonts.forEach(function(font, i) { 
			//first go through and update all the css without reading anything
			ftw.stillToDo.forEach(function(el) { 
				el.style.cssText = el.getAttribute('data-ftw-original-style');
				el.setAttribute('data-biggest-font', i==0 ? 'true' : '');
				if (font) {
					Object.keys(font).forEach(function(k) {
						el.style[k] = font[k];
					});
				}
			});
	
			// and then start measuring
			ftw.stillToDo.forEach(updateSingleWidth);
			
			var stillstill = [];
			ftw.stillToDo.forEach(function(el) { 
				if (!el.hasClass('ftw_done')) {
					stillstill.push(el);
				}
			});
			
			ftw.stillToDo = stillstill;

			//console.log(font, ftw.stillToDo.length + " left.");
			
			if (!ftw.stillToDo.length) {
				throw "all done";
			}
		});
		} catch (e) {
			if (e === 'all done') {
			} else {
				throw e;
			}
		}
		
		if (ftw.mode == "fonts") {
			ftw.stillToDo.forEach(function(el) { el.addClass('ftw_final'); });
			ftw.stillToDo.forEach(updateSingleWidth);
		}
	}

	function adjustFontSizeAndLetterSpacing(cell, lasttime) {
		var span = cell.firstElementChild;

		var success = false;

		var fullwidth = getContentWidth(cell);
		var textwidth = span.getBoundingClientRect().width;
		var lettercount = span.innerText.length-1; //this will probably get confused with fancy unicode text
		var fontsize = parseFloat(getComputedStyle(cell).fontSize);

		//if this is a borderline fit
		var onemore = false;

		//first try nudging the font size
		var newfontsize=fontsize, oldfontsize=fontsize, ratioToFit = fullwidth/textwidth;
		
		//for the widest font, we can max out the size
		if (ratioToFit > ftw.options.maxFontSize) {
			ratioToFit = ftw.options.maxFontSize;
		} else if (ratioToFit < ftw.options.minFontSize) {
			ratioToFit = ftw.options.minFontSize;
		}
		
		if (ratioToFit != 1 && ratioToFit >= ftw.options.minFontSize && ratioToFit <= ftw.options.maxFontSize) {
			//adjust the font size and then nudge letterspacing on top of that
			newfontsize = Math.round(fontsize * ratioToFit);
			cell.style.fontSize = newfontsize + 'px';
			textwidth *= newfontsize/fontsize;
			fontsize = newfontsize;

			if (ftw.mode == "fonts" && ratioToFit < ftw.options.avgFontSize) {
				if (ftw.options.preferredSize=="small") {
					success = true;
				} else {
					onemore = true;
				}
			} else {
				//if it grew we have to stop
				success = true;
			}
		}
	
		var letterspace = (fullwidth-textwidth)/lettercount/fontsize;

		if (letterspace >= ftw.options.minLetterSpace || newfontsize != oldfontsize || lasttime===true) {
			//adjust letter spacing to fill the width
			if (typeof ftw.options.maxLetterSpace === 'number') {
				letterspace = Math.min(letterspace, ftw.options.maxLetterSpace);
			}

			cell.style.letterSpacing = Math.max(letterspace, ftw.options.minLetterSpace) + 'em';

			if (ftw.mode == "fonts" && letterspace < 0) {
				if (ftw.options.preferredFit=="tight") {
					success = true;
				} else {
					onemore = true;
				}
			} else {
				//if it expanded we have to stop
				success = true;
			}
		}
		
		if (onemore && lasttime !== true) {
			adjustFontSizeAndLetterSpacing(cell, true);
		}
	}

	function updateSingleWidth(cell) {
		var span = cell.firstElementChild;

		var ontrial = cell.hasClass('ftw_onemore');
		var success = false;

		var fullwidth = getContentWidth(cell);
		var textwidth = span.getBoundingClientRect().width;
		var lettercount = span.innerText.length-1; //this will probably get confused with fancy unicode text
		var fontsize = parseFloat(getComputedStyle(cell).fontSize);

		//if this is a borderline fit
		var onemore = false;

		//for var
		if (ftw.mode === 'variable') {
			var axisVal = parseFloat(cell.getAttribute('data-axis-val'));
			var axisMin = parseFloat(cell.getAttribute('data-axis-min') || ftp.options.axisMin);
			var axisMax = parseFloat(cell.getAttribute('data-axis-max') || ftp.options.axisMax);

			if (ratioToFit > 1) {
				cell.setAttribute('data-axis-min', axisMin = axisVal);
			} else if (ratioToFit < 1) {
				cell.setAttribute('data-axis-max', axisMax = axisVal);
			}
			
			cell.setAttribute('data-axis-val', axisVal = (axisMin + axisMax) / 2);
			updateFVS(cell, axisVal);
		}

		//first try nudging the font size
		var newfontsize=fontsize, oldfontsize=fontsize, ratioToFit = fullwidth/textwidth;
		
		//for the widest font, we can max out the size
		if ((cell.getAttribute('data-biggest-font') || axisVal == axisMax) && ratioToFit > ftw.options.maxFontSize) {
			ratioToFit = ftw.options.maxFontSize;
		}
		
		if (ratioToFit != 1 && ratioToFit >= ftw.options.minFontSize && ratioToFit <= ftw.options.maxFontSize) {
			//adjust the font size and then nudge letterspacing on top of that
			newfontsize = Math.round(fontsize * ratioToFit);
			cell.style.fontSize = newfontsize + 'px';
			textwidth *= newfontsize/fontsize;
			fontsize = newfontsize;

			if (ftw.mode == "fonts" && ratioToFit < ftw.options.avgFontSize) {
				if (ftw.options.preferredSize=="small") {
					success = true;
				} else {
					onemore = true;
				}
			} else {
				//if it grew we have to stop
				success = true;
			}
		}
	
		var letterspace = (fullwidth-textwidth)/lettercount/fontsize;

		if (letterspace >= ftw.options.minLetterSpace || newfontsize != oldfontsize || cell.hasClass('ftw_final')) {
			//adjust letter spacing to fill the width
			cell.style.letterSpacing = Math.max(letterspace, ftw.options.minLetterSpace) + 'em';

			if (ftw.mode == "fonts" && letterspace < 0) {
				if (ftw.options.preferredFit=="tight") {
					success = true;
				} else {
					onemore = true;
				}
			} else {
				//if it expanded we have to stop
				success = true;
			}
		}
		
		if (onemore) {
			cell.addClass('ftw_onemore');
		} else if (ontrial || success) {
			cell.addClass('ftw_done');
		}
	}
	
	ftw.ready = true;
	
	var endtime = Date.now();
	//console.log("Widths updated in " + ((endtime-starttime)/1000) + "s");
};

window.FontToWidth = FontToWidth;


//handy polyfills and utility functions

// forEach on nodes, from MDN
if (window.NodeList && !NodeList.prototype.forEach) {
	NodeList.prototype.forEach = function (callback, thisArg) {
		thisArg = thisArg || window;
		for (var i = 0; i < this.length; i++) {
			callback.call(thisArg, this[i], i, this);
		}
	};
}

// jQuery-style addClass/removeClass are not canon, but more flexible than ClassList
if (!HTMLElement.prototype.hasClass) {
	HTMLElement.prototype.hasClass = function(str) {
		var el = this;
		var words = str.split(/\s+/);
		var found = true;
		words.forEach(function(word) {
			found = found && el.className.match(new RegExp("(^|\\s)" + word + "($|\\s)"));
		});
		return !!found;
	}
}

var spacere = /\s{2,}/g;
if (!HTMLElement.prototype.addClass) {
	HTMLElement.prototype.addClass = function(cls) {
		this.className += ' ' + cls;
		this.className = this.className.trim().replace(spacere, ' ');
		return this;
	}
}

if (!HTMLElement.prototype.removeClass) {
	HTMLElement.prototype.removeClass = function(cls) {
		var i, words = cls.split(/\s+/);
		if (words.length > 1) {
			for (var i=0; i < words.length; i++) {
				this.removeClass(words[i]);
			}
		} else {
			var classre = new RegExp('(^|\\s)' + cls + '($|\\s)', 'g');
			while (classre.test(this.className)) {
				this.className = this.className.replace(classre, ' ').trim().replace(spacere, '');
			}
		}
		return this;
	}
}

// closest, from MDN
if (!Element.prototype.matches) {
	Element.prototype.matches = Element.prototype.msMatchesSelector || 
								Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
	Element.prototype.closest = function(s) {
		var el = this;
		if (!document.documentElement.contains(el)) return null;
		do {
			if (el.matches(s)) return el;
			el = el.parentElement || el.parentNode;
		} while (el !== null && el.nodeType === 1); 
		return null;
	};	
}

// not in the spec, but seems weird to be able to do it on elements but not text nodes
if (!Node.prototype.closest) {
	Node.prototype.closest = function(s) {
		return this.parentNode && this.parentNode.closest(s);
	}
}

// my own invention
if (!RegExp.escape) {
	RegExp.escape= function(s) {
		return s.replace(/[\-\/\\\^\$\*\+\?\.\(\)\|\[\]\{\}]/g, '\\$&');
	};
}



function doOnReady(func, thisArg) {
	if (thisArg) {
		func = func.bind(thisArg);
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', func);
	} else {
		func();
	}
}

function hyphenToCamel (hyphen) {
	switch (typeof hyphen) {
	case "object":
		Object.keys(hyphen).forEach(function(key) {
			var val = hyphen[key];
			var newKey = hyphenToCamel(key);
			if (key != newKey) {
				hyphen[newKey] = val;
				delete hyphen[key];
			}
		});
		return hyphen;
	
	case "string":
		return hyphen.replace(/-([a-z])/g, function(x, letter) { return letter.toUpperCase() });
	
	default:
		return hyphen;
	}
}



})();


//FontFaceObserver
/* Font Face Observer v2.0.13 - © Bram Stein. License: BSD-3-Clause */
if (!document.fonts || !document.fonts.ready) {
(function(){'use strict';var f,g=[];function l(a){g.push(a);1==g.length&&f()}function m(){for(;g.length;)g[0](),g.shift()}f=function(){setTimeout(m)};function n(a){this.a=p;this.b=void 0;this.f=[];var b=this;try{a(function(a){q(b,a)},function(a){r(b,a)})}catch(c){r(b,c)}}var p=2;function t(a){return new n(function(b,c){c(a)})}function u(a){return new n(function(b){b(a)})}function q(a,b){if(a.a==p){if(b==a)throw new TypeError;var c=!1;try{var d=b&&b.then;if(null!=b&&"object"==typeof b&&"function"==typeof d){d.call(b,function(b){c||q(a,b);c=!0},function(b){c||r(a,b);c=!0});return}}catch(e){c||r(a,e);return}a.a=0;a.b=b;v(a)}}
function r(a,b){if(a.a==p){if(b==a)throw new TypeError;a.a=1;a.b=b;v(a)}}function v(a){l(function(){if(a.a!=p)for(;a.f.length;){var b=a.f.shift(),c=b[0],d=b[1],e=b[2],b=b[3];try{0==a.a?"function"==typeof c?e(c.call(void 0,a.b)):e(a.b):1==a.a&&("function"==typeof d?e(d.call(void 0,a.b)):b(a.b))}catch(h){b(h)}}})}n.prototype.g=function(a){return this.c(void 0,a)};n.prototype.c=function(a,b){var c=this;return new n(function(d,e){c.f.push([a,b,d,e]);v(c)})};
function w(a){return new n(function(b,c){function d(c){return function(d){h[c]=d;e+=1;e==a.length&&b(h)}}var e=0,h=[];0==a.length&&b(h);for(var k=0;k<a.length;k+=1)u(a[k]).c(d(k),c)})}function x(a){return new n(function(b,c){for(var d=0;d<a.length;d+=1)u(a[d]).c(b,c)})};window.Promise||(window.Promise=n,window.Promise.resolve=u,window.Promise.reject=t,window.Promise.race=x,window.Promise.all=w,window.Promise.prototype.then=n.prototype.c,window.Promise.prototype["catch"]=n.prototype.g);}());

(function(){function l(a,b){document.addEventListener?a.addEventListener("scroll",b,!1):a.attachEvent("scroll",b)}function m(a){document.body?a():document.addEventListener?document.addEventListener("DOMContentLoaded",function c(){document.removeEventListener("DOMContentLoaded",c);a()}):document.attachEvent("onreadystatechange",function k(){if("interactive"==document.readyState||"complete"==document.readyState)document.detachEvent("onreadystatechange",k),a()})};function r(a){this.a=document.createElement("div");this.a.setAttribute("aria-hidden","true");this.a.appendChild(document.createTextNode(a));this.b=document.createElement("span");this.c=document.createElement("span");this.h=document.createElement("span");this.f=document.createElement("span");this.g=-1;this.b.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.c.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
this.f.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.h.style.cssText="display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;";this.b.appendChild(this.h);this.c.appendChild(this.f);this.a.appendChild(this.b);this.a.appendChild(this.c)}
function t(a,b){a.a.style.cssText="max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;white-space:nowrap;font-synthesis:none;font:"+b+";"}function y(a){var b=a.a.offsetWidth,c=b+100;a.f.style.width=c+"px";a.c.scrollLeft=c;a.b.scrollLeft=a.b.scrollWidth+100;return a.g!==b?(a.g=b,!0):!1}function z(a,b){function c(){var a=k;y(a)&&a.a.parentNode&&b(a.g)}var k=a;l(a.b,c);l(a.c,c);y(a)};function A(a,b){var c=b||{};this.family=a;this.style=c.style||"normal";this.weight=c.weight||"normal";this.stretch=c.stretch||"normal"}var B=null,C=null,E=null,F=null;function G(){if(null===C)if(J()&&/Apple/.test(window.navigator.vendor)){var a=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))(?:\.([0-9]+))/.exec(window.navigator.userAgent);C=!!a&&603>parseInt(a[1],10)}else C=!1;return C}function J(){null===F&&(F=!!document.fonts);return F}
function K(){if(null===E){var a=document.createElement("div");try{a.style.font="condensed 100px sans-serif"}catch(b){}E=""!==a.style.font}return E}function L(a,b){return[a.style,a.weight,K()?a.stretch:"","100px",b].join(" ")}
A.prototype.load=function(a,b){var c=this,k=a||"BESbswy",q=0,D=b||3E3,H=(new Date).getTime();return new Promise(function(a,b){if(J()&&!G()){var M=new Promise(function(a,b){function e(){(new Date).getTime()-H>=D?b():document.fonts.load(L(c,'"'+c.family+'"'),k).then(function(c){1<=c.length?a():setTimeout(e,25)},function(){b()})}e()}),N=new Promise(function(a,c){q=setTimeout(c,D)});Promise.race([N,M]).then(function(){clearTimeout(q);a(c)},function(){b(c)})}else m(function(){function u(){var b;if(b=-1!=
f&&-1!=g||-1!=f&&-1!=h||-1!=g&&-1!=h)(b=f!=g&&f!=h&&g!=h)||(null===B&&(b=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent),B=!!b&&(536>parseInt(b[1],10)||536===parseInt(b[1],10)&&11>=parseInt(b[2],10))),b=B&&(f==v&&g==v&&h==v||f==w&&g==w&&h==w||f==x&&g==x&&h==x)),b=!b;b&&(d.parentNode&&d.parentNode.removeChild(d),clearTimeout(q),a(c))}function I(){if((new Date).getTime()-H>=D)d.parentNode&&d.parentNode.removeChild(d),b(c);else{var a=document.hidden;if(!0===a||void 0===a)f=e.a.offsetWidth,
g=n.a.offsetWidth,h=p.a.offsetWidth,u();q=setTimeout(I,50)}}var e=new r(k),n=new r(k),p=new r(k),f=-1,g=-1,h=-1,v=-1,w=-1,x=-1,d=document.createElement("div");d.dir="ltr";t(e,L(c,"sans-serif"));t(n,L(c,"serif"));t(p,L(c,"monospace"));d.appendChild(e.a);d.appendChild(n.a);d.appendChild(p.a);document.body.appendChild(d);v=e.a.offsetWidth;w=n.a.offsetWidth;x=p.a.offsetWidth;I();z(e,function(a){f=a;u()});t(e,L(c,'"'+c.family+'",sans-serif'));z(n,function(a){g=a;u()});t(n,L(c,'"'+c.family+'",serif'));
z(p,function(a){h=a;u()});t(p,L(c,'"'+c.family+'",monospace'))})})};"object"===typeof module?module.exports=A:(window.FontFaceObserver=A,window.FontFaceObserver.prototype.load=A.prototype.load);}());
}
