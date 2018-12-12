# Font-To-Width FTW

Font-To-Width if a small Javascript routine which fits text to the width of an element 
using multiple font styles of different widths.

© 2014–2018 [Chris Lewis] and [Nick Sherman]

Freely made available under the MIT license: http://opensource.org/licenses/MIT

### Usage

	<div class="ftw">Text To Fit</div>
	<script> 
		new FontToWidth({
			fonts: [
				'Font Family Name String',
				{ fontFamily: 'Complete CSS Spec', fontWeight: 'normal', fontStyle: 'italic' },
				…
			];
			elements: ".ftw, .css-selector-or-jQuery-object"
		}); 
	</script>

### Notes
* Multiple FontToWidth instances can be created using different font lists and elements.
* Elements can be anything that is display:block or inline-block
* If no fonts are specified, behavior reverts to a simple scale-to-width system

### Options

All options are optional.

Name            | Default                               | Description
----------------|---------------------------------------|----------------------------------------------------------------------------------
 fonts          |                                       | A list of font-family names or sets of CSS style parameters. If empty, existing fonts are scaled to fit
 variableFont   |                                       | A font object as in `fonts`, plus optional `axis`, `min`, `max` properties
 elements       | ".ftw, .font-to-width, .fonttowidth"  | A CSS selector or jQuery object specifying which elements should apply FTW
 minLetterSpace | -0.04                                 | A very small, probably negative number indicating degree of allowed tightening
 maxLetterSpace | none                                  | Maximum allowed letterspace stretching when font size maxes out
 minFontSize    | 1.0                                   | Allow scaling of font-size to this ratio of original
 maxFontSize    | 1.0                                   | Allow scaling of font-size to this ratio of original
 preferredFit   | "tight"                               | Whether to prefer "tight" or "loose" letterspacing
 preferredSize  | "large"                               | Whether to prefer "large" or "small" font-size

### History

* 2018-10-04 Add maxLetterSpace option
* 2018-02-05 Remove jQuery dependency; better font load detection; add support for variable fonts
* 2015-03-04 Added no-fonts scale-to-width behavior

* 2015-02-28
 * Added ability to specify complete CSS spec for each font style
 * Added min/maxFontSize, preferredFit/Size options
 * Added demo.html for usage hints
 * Support hyphenated-type or camelCaseType options
 * Bugfixes and safer coding style

* 2014-03-31 **Initial release**
 * Only option is 'min-letter-space'
 * Fitting errs on the side of tight spacing


[Chris Lewis]: http://chrissam42.com/
[Nick Sherman]: http://nicksherman.com/
