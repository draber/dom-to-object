/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Dieter Raber <me@dieterraber.net>

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function(window){

    'use strict';


    /**
     * The final result
     *
     * @type {{document: *, elements: null}}
     */
    var DomObj = {
        document: window.document,
        elements: null
    };


    /**
     * getComputedStyles in returns style in several formats,
     * only camel cased ones are used in this context
     *
     * @param key
     * @param value
     * @returns {boolean}
     */
    function isUnwantedStyle(key, value) {
        if (!isNaN(key) // numeric keys
            || key.charCodeAt(0) < 97 // keys starting with an upper case (MozStuff)
            || key.indexOf('-') > -1 // keys containing a dash
            || typeof value === 'function' // functions
        ) {
            return true;
        }
        return false;
    }


    /**
     * Name the element (div#foo.bar
     *
     * @param element
     */
    function buildLayerName(element) {
        var name = element.nodeName.toLowerCase(),
            id = element.id,
            className = element.className;

        if (id) {
            name += '#' + id;
        }

        if (className) {
            name += '.' + className.trim().replace(/\s+/g, '.');
        }

        return name;
    }


    /**
     * Convert image to base64
     * Heavily inspired by http://tinyurl.com/myjvhq2
     *
     * @param image
     * @returns {string}
     */
    function imageToBase64(image) {

        var isBg =  typeof image === 'string',
            canvas,
            ctx,
            dataUri,
            urlMatch,
            bgImage;

        // helper for background images
        if(isBg) {
            bgImage = image;
            urlMatch = bgImage.match(/^url\s*\(\s*("|')?([^'"\)\s]+)/);
            if(urlMatch === null) {
                return null;
            }
            image = new Image();
            image.src = urlMatch.pop();
            document.body.appendChild(image)
        }

        canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        dataUri = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');

        if(isBg){
            document.body.removeChild(image);
        }

        return dataUri;
    }


    /**
     * Parse a value for color and return the color as object
     *
     * @param value
     * @returns {*}
     */
    function parseColorSet(value) {
        var colorSet = value.toString().match(/^(hsla|rgba|hsl|rgb)\D+([\d\.%]+)\D+([\d\.%]+)\D+([\d\.%]+)\D+([\d\.%]+)?/);

        if (colorSet === null) {
            return value;
        }

        switch (colorSet[1]) {
            case 'rgb':
                return {
                    red: typeCast(colorSet[2]),
                    green: typeCast(colorSet[3]),
                    blue: typeCast(colorSet[4])
                };
            case 'rgba':
                return {
                    red: typeCast(colorSet[2]),
                    green: typeCast(colorSet[3]),
                    blue: typeCast(colorSet[4]),
                    alpha: typeCast(colorSet[5])
                };
            case 'hsl':
                return {
                    hue: typeCast(colorSet[2]),
                    saturation: typeCast(colorSet[3]),
                    lightness: typeCast(colorSet[4])
                };
            case 'hsla':
                return {
                    hue: typeCast(colorSet[2]),
                    saturation: typeCast(colorSet[3]),
                    lightness: typeCast(colorSet[4]),
                    alpha: typeCast(colorSet[5])
                }
        }
    }


    /**
     * Type-cast every value, loose 'px'
     *
     * @param value
     * @returns {*}
     */
    function typeCast(value) {
        var result;

        if (value === null) {
            return value;
        }

        // value might be a color set, if not the original value is returned
        value = parseColorSet(value);

        if (['string', 'number'].indexOf(typeof value) === -1) {
            return value;
        }
        result = value.toString().match(/^(\d+)((\.)(\d+))?/);

        if (result === null) {
            return value;
        }

        if (typeof result[4] !== 'undefined') {
            return Math.round(parseFloat(result[0]) * 100) / 100;
        }
        return parseInt(result[0], 10);
    }

    /**
     * Get offset relative to view port
     *
     * @param element
     * @returns {{}}
     */
    function getOffset(element) {
        var resultSet = {},
            key,
            offset = element.getBoundingClientRect();

        // calculate offset
        for (key in offset) {
            resultSet[key] = ['top', 'bottom'].indexOf(key) > -1
                ? typeCast(offset[key] + document.documentElement.scrollTop || document.body.scrollTop)
                : typeCast(offset[key] + document.documentElement.scrollLeft || document.body.scrollLeft);
        }

        return resultSet;
    }

    /**
     * Retrieve styles of pseudo elements
     *
     * @param element
     */
    function getPseudoElements(element) {
        var resultSet = {},
            style,
            styles,
            pseudoElements = ['after', 'before'],
            i = pseudoElements.length;

        while (i--) {
            resultSet[pseudoElements[i]] = {};
            resultSet[pseudoElements[i]].styles = {};
            resultSet[pseudoElements[i]].text = {};
            styles = window.getComputedStyle(element, '::' + pseudoElements[i]);
            for (style in styles) {
                if (isUnwantedStyle(style, styles[style])) {
                    continue;
                }
                resultSet[pseudoElements[i]].styles[style] = typeCast(styles[style]);
                // this is to have the same structure as in regular elements
                if (style === 'content') {
                    resultSet[pseudoElements[i]].text[style] = styles[style];
                }
            }
        }
        return resultSet;
    }


    /**
     * Compute the style for a single element
     *
     * @param element
     */
    function getStyles(element) {
        var resultSet = {},
            key,
            styles = window.getComputedStyle(element, null);

        for (key in styles) {
            if (isUnwantedStyle(key, styles[key])) {
                continue;
            }
            if(key === 'backgroundImage') {
                resultSet.backgroundImageBase64 = imageToBase64(styles[key]);
            }
            resultSet[key] = typeCast(styles[key]);
        }

        return resultSet;
    }

    /**
     * Retrieve element attributes, href and src will be evaluated
     *
     * @param element
     * @returns {{}}
     */
    function getAttributes(element) {
        var resultSet = {};
        Array.prototype.slice.call(element.attributes).forEach(function (attribute) {
            resultSet[attribute.name] = ['href', 'src'].indexOf(attribute.name) > -1
                ? element[attribute.name]
                : typeCast(attribute.value);
        });
        return resultSet;
    }


    /**
     * Retrieve element data set
     *
     * @param element
     * @returns {{}}
     */
    function getDataSet(element) {
        var resultSet = {},
            data;

        for (data in element.dataset) {
            resultSet[data] = typeCast(element.dataset[data]);
        }

        return resultSet;
    }


    /**
     * Fetch all elements from the DOM
     *
     * @param element
     * @returns {{layerName: *, styles: *, pseudoElements: *, offset: {}, text: (string|textContent|*), attributes: {}, dataSet: {}, children: Array}}
     */
    function parseDomRecursively(element) {
        var children = element.children,
            child,
            elementProps = {
                layerName: buildLayerName(element),
                styles: getStyles(element),
                pseudoElements: getPseudoElements(element),
                offset: getOffset(element),
                text: element.textContent,
                attributes: getAttributes(element),
                dataSet: getDataSet(element),
                children: []
            };

        if(element.nodeName === 'IMG') {
            elementProps.base64 = imageToBase64(element);
        }

        for (child in children) {
            if (children.hasOwnProperty(child)) {
                elementProps.children.push(parseDomRecursively(children[child]));
            }
        }
        return elementProps;
    }

    var DomToObject = (function () {


        /**
         * Initialise parser
         *
         * @returns {{document: *, elements: {layerName: *, styles: *, pseudoElements: *, offset: {}, text: (string|textContent|*), attributes: {}, dataSet: {}, children: Array}}}
         */
        function init() {
            DomObj.elements = parseDomRecursively(window.document.documentElement);
            return DomObj;
        }


        /**
         * Public functions
         */
        return {
            init: init
        }

    }());


    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = DomToObject;
        }
        exports.DomToObject = DomToObject;
    }
    else if (typeof define === 'function' && define.amd) {
        define([], function() {
            return DomToObject;
        });
    }
    else {
        window.DomToObject = DomToObject;
    }

}(window));
