/*
 * FONT-TO-WIDTH FTW
 *
 * Fits text to the width of an element using multiple font families of different widths.
 * 
 * Usage: 
 * <element>Text To Fit</element>
 * <script> new FontToWidth({fonts:["List","of","font","families"], elements:"CSS selector for elements"}); </script>
 *
 * Notes:
 * Multiple FontToWidth instances can be created using different font lists and elements.
 * Element can be any block or inline-block element.
 *
 * © 2014 Chris Lewis http://chrissam42.com and Nick Sherman http://nicksherman.com
 * Freely made available under the MIT license: http://opensource.org/licenses/MIT
 * 
 * CHANGELOG:
 * 2015-02-28 Allow arbitrary CSS styles for each font
 * 2014-03-31 Initial release: minLetterSpace option; errs on the side of narrow spacing
 *
 */

;(function() {
'use strict';

function hyphenToCamel (hyphen) {
    switch (typeof hyphen) {
    case "object":
        $.each(hyphen, function(key, val) {
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

    //OPTIONS 
    
    //fill out fonts CSS with default settings
    this.mode = "fonts";
    if (!options.fonts) {
        this.mode = "scale";
        options.fonts = [ false ];
    } else {
        $.each(options.fonts, function(i, font) {
            if (typeof font == "string") {
                options.fonts[i] = font = { fontFamily: font };
            }
            hyphenToCamel(font);
            font.fontWeight = font.fontWeight || 'normal';
            font.fontStyle = font.fontStyle || 'normal';
            if (font.fontSize) delete font.fontSize;
        });
    }

    options.elements = options.elements || '.ftw, .font-to-width, .fonttowidth';
    options.minLetterSpace = typeof options.minLetterSpace === "number" ? options.minLetterSpace : -0.04;
    options.minFontSize = options.minFontSize || (this.mode == "scale" ? 0.01 : 1.0);
    options.maxFontSize = options.maxFontSize || (this.mode == "scale" ? 100 : 1.0);
    options.preferredFit = options.preferredFit || "tight";
    options.preferredFit = options.preferredSize || "large";

    this.measuringText = 'AVAWJ wimper QUILT jousting';
    this.initialized = false;
    this.ready = false;
    this.options = options;
    this.fontwidths = new Array(options.fonts.length);
    this.allTheElements = $(options.elements);

    this.allTheElements.each(function() {
        var el = $(this);
        el.css('white-space', 'nowrap');
        el.data('ftw-original-style', el.attr('style'));
        el.wrapInner("<span style='display:inline !important'></span>");
    });

    $($.proxy(this.measureFonts,this)); 
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
	$('head').append('<style id="ftw-adobe-blank">@font-face { font-family: AdobeBlank; src: url("data:application/vnd.ms-fontobject;base64,' + ftw.eotData + '") format("embedded-opentype"), url("data:application/font-woff;base64,' + ftw.woffData + '") format("woff"); }</style>');

    //create a hidden element to measure the relative widths of all the fonts
    var div = ftw.measure_div = $("<div style='position:absolute;top:0px;right:101%;display:block;white-space:nowrap;'></div>");

    $.each(ftw.options.fonts, function(i, font) {
        var span = $('<span style="outline:1px solid green;">' + ftw.measuringText + '</span>');
        span.css({
            'font-size': '36px',
            'display': 'inline',
        });
        span.css(font);
        
        //first load up a default font
        span.data('font-family', span.css('font-family'));
        span.css('font-family', 'AdobeBlank');
        
        div.append(span);
        div.append("<br>");
    });
    
    $('body').append(div);

    //keep re-measuring the widths until they've all changed
    // Most browsers will load zero-width Adobe Blank
    // But otherwise they will load fallback, so hopefully your font isn't the same width as Times New Roman
    var tries = 60; 
    var spans = ftw.measure_div.children('span');
    var origwidths = new Array(ftw.fontwidths.length);

    var measurefunc = function() {

        if (--tries < 0) {
            console.log("Giving up!");
            clearInterval(ftw.measuretimeout);
            $('#ftw-adobe-blank').remove();
            return;
        }

        var allLoaded = true;
        spans.each(function(i) {
            var span = $(this);
            ftw.fontwidths[i] = span.width();
            if (ftw.fontwidths[i] == origwidths[i]) {
                allLoaded = false;
                return false;
            }
        });

        console.log("Measured", Date.now()/1000, ftw.fontwidths);
        
        if (allLoaded) {
            ftw.ready = true;
            clearInterval(ftw.measuretimeout);

            //sort the font list widest first
            var font2width = new Array(ftw.options.fonts.length);
            $.each(ftw.fontwidths, function(i, mywidth) {
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
            $.each(font2width, function(i, font) {
                newfonts[i] = ftw.options.fonts[font.index];
            });
            
            ftw.options.fonts = newfonts;

            ftw.measure_div.remove();
            $('#ftw-adobe-blank').remove();

            ftw.startTheBallRolling();
        }
        
    };
    
    //measure the initial width and then restore the font-family
    setTimeout(function() {
        spans.each(function(i) {
            var span = $(this);
            origwidths[i] = span.width();
            if (origwidths[i] == 0) {
                //font could not be loaded
                origwidths[i] = -1;
            }
            span.css('font-family', span.data('font-family') + ', AdobeBlank');
        });
        setTimeout(measurefunc, 50); //again allow a bit of time for the new fonts to take
        ftw.measuretimeout = setInterval(measurefunc, 500);
    }, 10); //it takes a few milliseconds for fonts to be applied after they're loaded

};

FontToWidth.prototype.startTheBallRolling = function() {
    var ftw = this;

    //only do this stuff once
    if (ftw.initialized)
        return;
        
    ftw.initialized = true;
    
    var updatewidths = $.proxy(ftw.updateWidths, ftw);
    
    //update widths right now
    $(updatewidths);
    
    //update widths on window load and resize (delayed)
    var resizetimeout;
    $(window).on('load', updatewidths).on('resize', function() { 
        if (resizetimeout) 
            clearTimeout(resizetimeout);
        resizetimeout = setTimeout(updatewidths, 250);
    });

    //update on live text change
    /*
    ftw.allTheElements.on('keyup',function() {
        //similar to updateWidths() below, but different enough to implement separately
        var cell = $(this);
        cell.removeClass('ftw_done');
        
        var i, fontfamily;
        for (i in ftw.options.fonts) { 
            fontfamily = ftw.options.fonts[i];
    
            cell.css({'font-family': fontfamily, 'letter-spacing': ''});
            cell.each(ftw.updateSingleWidth);
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

    ftw.stillToDo = $(ftw.allTheElements).removeClass('ftw_done ftw_final ftw_onemore');

    //doing this in waves is much faster, since we update all the fonts at once, then do only one repaint per font
    // as opposed to one repaint for every element

    var updateSingleWidth = function(i, el) {
        var cell = $(el);
        var span = cell.children('span');

        var ontrial = cell.hasClass('ftw_onemore');
        var success = false;

        var fullwidth = cell.width();
        var textwidth = span.outerWidth();
        var lettercount = span.text().length-1; //this will probably get confused with fancy unicode text
        var fontsize = parseFloat(cell.css('font-size'));

        //if this is a borderline fit
        var onemore = false;

        //first try nudging the font size
        var newfontsize=fontsize, oldfontsize=fontsize, ratioToFit = fullwidth/textwidth;
        
        //for the widest font, we can max out the size
        if (cell.data('biggest-font') && ratioToFit > ftw.options.maxFontSize) {
            ratioToFit = ftw.options.maxFontSize;
        }
        
        if (ratioToFit != 1 && ratioToFit >= ftw.options.minFontSize && ratioToFit <= ftw.options.maxFontSize) {
            //adjust the font size and then nudge letterspacing on top of that
            newfontsize = Math.round(fontsize * ratioToFit);
            cell.css('font-size', newfontsize + 'px');
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
            cell.css('letter-spacing', Math.max(letterspace, ftw.options.minLetterSpace) + 'em');

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
    $.each(ftw.options.fonts, function(i, font) { 
        //first go through and update all the css without reading anything
        ftw.stillToDo.each(function() { 
            var el = $(this);
            el.attr('style', el.data('ftw-original-style'));
            el.data('biggest-font', i==0);
            font && el.css(font);
        })
        // and then start measuring
        .each(updateSingleWidth);
        
        ftw.stillToDo = ftw.stillToDo.not('.ftw_done');
        
        //console.log(font, ftw.stillToDo.length + " left.");
        
        if (!ftw.stillToDo.length) {
            return false;
        }
    });
    
    if (ftw.mode == "fonts") {
        ftw.stillToDo.addClass('ftw_final').each(updateSingleWidth);
    }
    
    ftw.ready = true;
    
    var endtime = Date.now();
    console.log("Widths updated in " + ((endtime-starttime)/1000) + "s");
};

FontToWidth.prototype.eotData = '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';

FontToWidth.prototype.woffData='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';

window.FontToWidth = FontToWidth;

})();
