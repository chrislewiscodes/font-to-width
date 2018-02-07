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
 * © 2018 Chris Lewis http://chrissam42.com and Nick Sherman http://nicksherman.com
 * Freely made available under the MIT license: http://opensource.org/licenses/MIT
 * 
 * CHANGELOG:
 * 2018-02-05 Remove jQuery dependency; add support for variable fonts
 * 2015-02-28 Allow arbitrary CSS styles for each font
 * 2014-03-31 Initial release: minLetterSpace option; errs on the side of narrow spacing
 *
 */

;(function() {
'use strict';

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


/**
 * @param  options
 * @param [options.fonts]						A list of font-family names or sets of CSS style parameters.
 * @param [options.elements=".ftw"]			A CSS selector or jQuery object specifying which elements should apply FTW
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
	ftw.mode = "fonts";
	if (!options.fonts) {
		ftw.mode = "scale";
		options.fonts = [ false ];
	} else {
		options.fonts.forEach(function(font, i) {
			if (typeof font == "string") {
				options.fonts[i] = font = { fontFamily: font };
			}
			hyphenToCamel(font);
			if (font.fontFamily.indexOf(' ') >= 0 && !font.fontFamily.match(/^['"]/)) {
				font.fontFamily = '"' + font.fontFamily + '"';
			}
			font.fontWeight = font.fontWeight || 'normal';
			font.fontStyle = font.fontStyle || 'normal';
			if (font.fontSize) delete font.fontSize;
		});
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

	//add Adobe Blank @font-face
	var style = document.createElement('style');
	style.id = "ftw-adobe-blank";
	style.textContent = '@font-face { font-family: AdobeBlank; src: url("data:application/font-woff;base64,' + ftw.woffData + '") format("woff"); }';
	document.head.appendChild(style);

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

	//then go through and set default measurement font
	spans.forEach(function(span) {
		span.setAttribute('data-font-family', span.style.fontFamily || getComputedStyle(span).fontFamily);
		span.style.fontFamily = 'AdobeBlank';
	});

	//keep re-measuring the widths until they've all changed
	// Most browsers will load zero-width Adobe Blank
	// But otherwise they will load fallback, so hopefully your font isn't the same width as Times New Roman
	var tries = 60; 
	var origwidths = new Array(ftw.fontwidths.length);
	var measurefunc = function() {

		if (--tries < 0) {
			var blank = document.getElementById('ftw-adobe-blank');
			console.log("Giving up!");
			clearInterval(ftw.measuretimeout);
			blank.parentNode.removeChild(blank);
			return;
		}

		var allLoaded = true;
		spans.forEach(function(span, i) {
			ftw.fontwidths[i] = span.getBoundingClientRect().width;
			if (ftw.fontwidths[i] == origwidths[i]) {
				allLoaded = false;
			}
		});

		console.log("Measured", Date.now()/1000);
		
		if (allLoaded) {
			ftw.ready = true;
			clearInterval(ftw.measuretimeout);

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

			//ftw.measure_div.parentNode.remove(ftw.measure_div);
			
			var blank = document.getElementById('ftw-adobe-blank');
			blank.parentNode.removeChild(blank);

			ftw.startTheBallRolling();
		}
		
	};
	
	//measure the initial width and then restore the font-family
	setTimeout(function() {
		spans.forEach(function(span, i) {
			origwidths[i] = span.getBoundingClientRect().width;
			span.style.fontFamily = span.getAttribute('data-font-family') + ', AdobeBlank';
		});
		//setTimeout(measurefunc, 50); //again allow a bit of time for the new fonts to take
		ftw.measuretimeout = setInterval(measurefunc, 500);
	}, 10); //it takes a few milliseconds for fonts to be applied after they're loaded

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
	
	ftw.options.avgFontSize = (ftw.options.maxFontSize + ftw.options.minFontSize)/2;
	
	var starttime = Date.now();
	
	ftw.ready = false;

	ftw.stillToDo = ftw.allTheElements;
	ftw.stillToDo.forEach(function(el) { el.removeClass('ftw_done ftw_final ftw_onemore'); });

	//doing this in waves is much faster, since we update all the fonts at once, then do only one repaint per font
	// as opposed to one repaint for every element

	var updateSingleWidth = function(cell) {
		var span = cell.querySelector('span');

		var ontrial = cell.hasClass('ftw_onemore');
		var success = false;

		var fullwidth = cell.getBoundingClientRect().width;
		var textwidth = span.getBoundingClientRect().width;
		var lettercount = span.innerText.length-1; //this will probably get confused with fancy unicode text
		var fontsize = parseFloat(getComputedStyle(cell).fontSize);

		//if this is a borderline fit
		var onemore = false;

		//first try nudging the font size
		var newfontsize=fontsize, oldfontsize=fontsize, ratioToFit = fullwidth/textwidth;

		//for the widest font, we can max out the size
		if (cell.getAttribute('data-biggest-font') && ratioToFit > ftw.options.maxFontSize) {
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
	};
	
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
	
	ftw.ready = true;
	
	var endtime = Date.now();
	console.log("Widths updated in " + ((endtime-starttime)/1000) + "s");
};

FontToWidth.prototype.woffData='d09GRgABAAAAABDoAA4AAAAAOqwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABPUy8yAAABwAAAAGAAAABgT+FMRmNtYXAAAAIoAAAC6wAAEGYCJiahY3Z0IAAABYgAAAAIAAAACAAA/wZmcGdtAAAFFAAAAGgAAABomSqvWmdhc3AAABDcAAAADAAAAAwABwAHZ2x5ZgAABZgAAABkAAAAZCducaVoZWFkAAABRAAAADYAAAA2AkGqTmhoZWEAAAF8AAAAJAAAACQHpgNzaG10eAAAAiAAAAAIAAAACAPoAHxsb2NhAAAFkAAAAAYAAAAGADIAKm1heHAAAAGgAAAAIAAAACAIGwASbmFtZQAABfwAAAquAAAnTg/tVrZwb3N0AAAQrAAAAC8AAAAvmjZpxXByZXAAAAV8AAAACgAAAAo/cRk9AAEAAAABCj3fJJsFXw889QADA+gAAAAAzqFiggAAAADRHPm3AAD/iANsA3AAAAADAAIAAAAAAAAAAQAAA3D/iADIA+gAAAAAA2wAAQAAAAAAAAAAAAAAAAAAAAIAAQAAAAIAEAAFAAAAAAACAAQAAAAPAAAIAAAAAAAAAAAEAAABkAAFAAACigJYAAAASwKKAlgAAAFeADIA3AAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAABBREJFAcAAAAD/A3D/iADIA3AAeAAAAAEAAAAAAAAAAAAAACAAAAPoAHwAAAAAeJzt1/e/T3UcwPHzvfea3WxZmZGdkuxsEVf2SBeVpOydTZmFijKKhq3sEVKUVHahslL2HpVNuL6vr9cPHv4BP3A+j+fnvB7vxzm/ncd5nBMEQaIgCKLDCoXFBEFUXBAKV5AiPjwNRebRQfLIPCYqR+SamMg8ISEhiJzCW4g7w/v9dS+vWJ6H2FRB5AgFtx2hO0Qp5LMXbceITiQ6segkopOKTiY6uegHRMeKflB0CtEpRacSnVp0GtFpRacTnV70Q6IziM4oOpPozKKziH5YdFbR2URnF51DdE7RuUQ/Ijq36DyiHxWdV3Q+0flFFxBdULfeJbfQhUU/JrqI6MdFPyG6qOgnRRcT/ZTo4qJLiC4pupTo0qLLiC4r+mnR5USXF11BdEXRlURXFl1FdFXRz4iuJrq66GdF1xBdU3Sc6FqinxNdW3Qd0XVF1xNdX3QD0Q1FNxLdWHQT0c+Lbir6BdHxopuJbi66hegXRb8k+mXRLUW/IrqV6FdFtxb9mujXRbcR3VZ0O9HtRXcQ3VF0J9GdRXcR3VV0N9HdRfcQ/YbonqJ7ie4tuo/ovqL7ie4veoDogaLfFP2W6EGiB4seInqo6GGih4t+W/Q7okeIHil6lOh3Rb8n+n3Ro0WPEf2B6A9FjxU9TvR40RNEfyT6Y9ETRU8S/YnoT0V/Jvpz0ZNFTxE9VfQ00dNFzxA9U/Qs0V+I/lL0bNFzRM8VPU/0fNELRC8UvUj0YtFLRH8leqnoZaKXi/5a9ArR34j+VvRK0atEfyf6e9GrRf8geo3oH0X/JPpn0WtFrxO9XvQG0RtFbxK9WfQvon8VvUX0VtHbRP8m+nfRf4jeLnqH6J2id4neLfpP0XtE/yX6b9F7Re8TvV/0AdEHRR8SfVj0EdFHRR8TfVz0CdEnRZ8SfVr0GdH/iP5X9H+iz4o+J/q86AuiL4q+JPqy6Cuir4r+X/Q10ddF3xCdoFCQOIpvcIZ3+8/k/rqr6ybdtAj3AEAPDg0MCwoJCAcGBQQDAgEALBcvPC0sLzwtLBESOS0sERIXOS0sEBf9PC0sEBf0PC0sEBfdPC0sEBfUPC0sEP0tLBD0LSwQ3S0sENQtLMQtLMAtLABACgEAAAEBAgIDAwAWPz8/PxYtsTAAuAEkGIWNHQAAAAAAAAAA/wYAAAAqADIAAAAFAHz/iANsA3AAAwAGAAkADAAPAAATESERAREBNwEhFxEBBwEhfALw/TwBMRv+zwJiG/7PGwEx/Z4DcPwYA+j8bQM+/mElAaMp/MIBnyX+XQAAAAABAAAAAAAAAAAAAAAAMQB4nN1a624bxxUeOU56CWKgRdE//bMwCsMGKFq2rKSOftESZQuhSEWk4uTnklySWy25LJeUykdqH6IP0QfoQxR9gJ7znTM7s+SSYpUWAWqB5OxczpzLdy4za2PMr8zfzZ7hf3vmc3zzv0fmZ/Qk7U/M78yvtf3Ym/OpeWv2tf2Z+aUZ0My9x7+gp4mZanvP/Nb8Q9uPzBPzL21/Yr7ce6Ttx96cT81s7w/a/sz8Zu+v2v65ebP3N21/Tu1/avuL3z959EzbT8yHZ29q/bQbBe+ScHJzFQ0XSTh7VT04PDqunb6rH2MQY/Tcelf/LpplcToJZMplmxsHh8ejdN5LJ7f8VP3q4Hgc3kTpfFBN4u7r6lH16O3BgSNk/mIC89ocmFfmkFo10zep6ZqI2m2zNJmZU3tMv4E5J730aHRG2uHvEGN9U8W6hP4Cc2ViMzQjGsnwFNFvRHNvdaZP/x2tCInmDeYNzQLPM+KkSvwcmiNzTPNPaV4dLbvSrZPxFmZ8h30y2j+lsaBA5ZJksT3cd0wcpsRjD3Nv87Gq+Yq+j0nekKhHmDOg3oSodklLVaLGn7egU8bRQ/TH2ppT39fmJf3d4a9Ko5ZSFavGNDYnilPqeblBjwHxyTvNqD+hTwjt96lnQeN9aCggKiPl79w06LcFmqyzM+hjTq0GUeqhN8PcffpMPZqyRwjaMVb0YLuI9LUAFpbUF2LXALwG1E4xk5/u6CmhX6FgORro/plynAA//LSkkQUoDrFLhFWpt9b9spSi8ZQoupGkINPX5gvyef6c0Lwp7TDLsRv8F7wiMM//A8u+MBVacQddjko8x7dNkyiMwUs5CqxcHaIkeHBr29DJnHYSa1nEFHXz4xHD0pR5JH/W+UtW0Ca9PdglVn66wDQjp+IhS2aGNJIBDSHpK6Re1kUX+PG1GoLjmvkW7TnZJVixUUa7Mg6mQGEV3Cf0y5Yd0niL1jdyCfZ/kj/e2VnikmJfE3K16LcDS5wTprm3Td+b7CA+/dp8ibURaWtGNmdULBX7BxQNf1op+XNJvlAnm10QwhvUsshhyw4RQZISX98lpj1Xa74AGmZeTGH/jsnHJCPNFUWMgYRQx3jqo4+/bxWXU/ik7CS8MH4TRaKNDDHmu0jHUXVG7T9Sbw+Yq3hcLGhUosq8JEoGwGqkdMW2HH8HusJpJUR07iNmsQ6c/7DnTZB7Y5W6p5yPIf8EvhMjGvl+JxwK77e5PkJwZ+OznZvmthhAC6wn0aZkrAm0O8Leo5UswJl4qd7PGhmppfqFGDDOOYm0ZwLuQuhhovgfwa/9eJCqTmfwdT8uCYbO4GMhrMiRJ9uYTforfIt+hOuFzqgoshbUjvOeMc3k50Ee6axcIqfYZYYKZJHnFqtlm2cliqawpX0WTpceum0GzoBMiarLfOYYfCbQYoaqrrOWlyuq3R7NEznsjhNQkowRIwo7tFtry/oeZlvtdDXTJLlGmJMunvp53zZdiL5eYg9fNj/uC3fZWvYrItjWIiG0ZFfN1nLxRFGcleh2keOhu5NGyvXs107r60WPI2BSItDM06zlpJvXaZtrQSuj84QgrzJt9Cgi3eeXaf8JsWMGq9n4N1BbrHuEzAvVQ1drjPJqgGsc0bWVLERcTBS7aQF/Ka1deLy4GGmlz3LUltWdqVfxxGiXW8DFi1PKSmeUc5v06dCnhczLI0+3VF5PVRsDjT+r9SzL7nLJAHVItKG69704KK1nP6hX8F7Pad2LnbVvcdjTPWeq9zHaN7kPZkYyFsdwi5G4EMP9uBGpNy6IRk9tYCWsaFSI1Y+LNVnxVOHb2uVBZ5unO1XSm2xhUeX7ewbf6K1EbF96fh7oOcRZpVdilUy5dr4jtvH5b+mKGFzwGbtYz92HI1uFSH1h6wRB1bZzgdQAU8yIvKiUQfPlkfghOPRlvVjLhbvJuj37jLX2sfyFyCwuBqRAXF+9aq4jlTwWsF27Wh3NIa1du48aulht2FWurkn1HCKzXcT169Vyba/WtNuRUMkl7CGHTXTuMI/IY+jFRTmZbSvM1ai4DR1W7wH4vTMBuL5FxORVFs++dWvQ3Qi77WLJDNJO8uwW5RJFeZ/k76HWleO8fw68j1C/9lRbd9Cf9ctUv13emyovqWe5QO+I1rFe9LLNuqp6J5k6RaMLyhBtnN9aOLc9g6dw+3Qtf1waucuIcQtifVeiqnAdqQ1FAxPlrmL8OtyeRqR2HprIO2NYfRdl5zuFuWZpV+G5GLaKzM3Su50W+b2ArYGXWrMITamFI49DVwcW6+Tl1orQP6VIPZuYbVX2AmhdHXV3D+t+uF1aiRb2PLeKk4FG4xTVqWhWENbXk1aKzOtup14hVzdRjfg12v0+OlGMFyNOrBEg1j2l9l2oj5TFIVvzl0Ug2eG+uJ2pBYtnueIZRPhiew08n3kN6R++7+62W+Vv/VzyvzmDuChWfgqJcHofFbzPxiTxUP9UKncNtxsrDqmgY6253Gm+vPpztX6mFP2TW7Ge64NXH6O2KprrPvuwnSBLIvSf9bTgV34jVHS8Yt/YO2Z3lzfSHps1/FzrdDBVjU4hu73BGasmJYOUUR8j/0vfXG8zYmCyj92sNe1+VgKbTQWfcoPmV+ybz+epara4T1HPUunHWnffYuZdacW10ErX+c+hRo90B295iK8slH+7Zpdq2z9/uBt+1uVU8SdvFGy+nptIK6zN2bCY/1b1Ivfzco6f5tFWbHFflVo8ywgN8f9iPT3J72KmKkdUUo0LIsceSqx27BnDomOa3zs4qYq0rLX9s+gbaNaezycrGi/ad9dzon8iDgpVXDndbbiRGzzJycV7Cndv4t8tjjEnyuu/PvbNtK6RKNPXG5A5bGTj2nIHxFcUdxzxpl625jhxA/7uNP4PCyhfrwmF3o/Tsx+NN2t6Vsgq/j3FwzzIYeeogJ3tVc56xSSclVVTrn6474wklBfwMIuLTRlX/CLW25Cl2e0+w68O3U5FJG7a8b57s///e7JdTjmd/JTTJATb88z2932sd6k8Lf8LjRHWVrc0Ghu52x+YTafo1epntapev62VjO/f5fHp7MQ0iPdzkoJlEd4/4F2ae8vWxvuBjvlIM68wdo7/ZcDvq1oUZ85xL3hKPXzybev4UyDwI056H2jeNWgJjSv6Zto/GHn3EOCZn76BNk+xtm6+13dibVBtUTsAr5d481fXebyC5biGTE3z3vA7YtmvSavsm8IL8CKcdqjf7Vrk6hw7Ws5EMyckg4zWiPY56DH/FWiK282czzPltAYdMeUO3lNeQ9dX6L2m30uaJ+8ta5BZuG1ChjMaF1nq4EAsIRyd4F3oD5jxnvjqgItLYFBmViDhFf7PCK/nXb9Br3DWUitz21Gpqi6FjwD/06SeY4Dlb+AtkUXIOh8BLN3ArlewQl11X9N3mr52RPcOgczfKd5/1iB3u5RfS61ogzIM2B3eQ4o69NHA7DZuKE5AqZGv55VX6O94NAXdYvmGp8MTvb2om29p17oipwYNFaUQP2D+nRSi55p+n+TRw7dxU214klu0BSyta+UjPK6OWTXYo51r4QxeeqGcX3s4sna8VhS2cs6K+rXeYuftEiGElt27aMFTvOVuKIftXBv3060+6H8Qcb4dohaT9WOT/Bs9i5bUAAAAAgAAAAAAAP+cADIAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAABAghjaWQwMDAwMQAAAAACAAgAAv//AAM=';

window.FontToWidth = FontToWidth;

})();
