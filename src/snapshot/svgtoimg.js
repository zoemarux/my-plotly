/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Lib = require('../lib');
var EventEmitter = require('events').EventEmitter;

function svgToImg(opts) {

    var ev = opts.emitter || new EventEmitter();

    var promise = new Promise(function(resolve, reject) {

        var Image = window.Image;

        var svg = opts.svg;
        var format = opts.format || 'png';

        // IE is very strict, so we will need to clean
        //  svg with the following regex
        //  yes this is messy, but do not know a better way
        // Even with this IE will not work due to tainted canvas
        //  see https://github.com/kangax/fabric.js/issues/1957
        //      http://stackoverflow.com/questions/18112047/canvas-todataurl-working-in-all-browsers-except-ie10
        // Leave here just in case the CORS/tainted IE issue gets resolved
        if(Lib.isIE()) {
            // replace double quote with single quote
            svg = svg.replace(/"/gi, '\'');
            // url in svg are single quoted
            //   since we changed double to single
            //   we'll need to change these to double-quoted
            svg = svg.replace(/(\('#)(.*)('\))/gi, '(\"$2\")');
            // font names with spaces will be escaped single-quoted
            //   we'll need to change these to double-quoted
            svg = svg.replace(/(\\')/gi, '\"');
            // IE only support svg
            if(format !== 'svg') {
                var ieSvgError = new Error('Sorry IE does not support downloading from canvas. Try {format:\'svg\'} instead.');
                reject(ieSvgError);
                // eventually remove the ev
                //  in favor of promises
                if(!opts.promise) {
                    return ev.emit('error', ieSvgError);
                } else {
                    return promise;
                }
            }
        }

        var canvas = opts.canvas;

        var ctx = canvas.getContext('2d');
        var img = new Image();

        // for Safari support, eliminate createObjectURL
        //  this decision could cause problems if content
        //  is not restricted to svg
        var url = 'data:image/svg+xml,' + encodeURIComponent(svg);

        canvas.height = opts.height || 150;
        canvas.width = opts.width || 300;

        img.onload = function() {
            var imgData;

            // don't need to draw to canvas if svg
            //  save some time and also avoid failure on IE
            if(format !== 'svg') {
                // trello172: 画像ダウンロード機能の画質向上
                // （直でctx.drawImage(img, 0, 0)実行ではなく、devicePixelRatioを加味して実行）
                var drawOpts = {
                  auto: true,
                  canvas: canvas,
                  image: img
                };

                // trello353: radarチャート画増化
                var isRadar = (d3.select('#chart_area > .radarChart').size() > 0) ? true : false;
                if (isRadar) {
                  // radar 固定解像度
                  ctx.drawImage(img, 0, 0);
                } else {
                  // others ディスプレイに対応する解像度（＝ディスプレイ次第）
                  drawImageForHighDPICanvas(drawOpts);
                }
            }

            switch(format) {
                case 'jpeg':
                    imgData = canvas.toDataURL('image/jpeg');
                    break;
                case 'png':
                    imgData = canvas.toDataURL('image/png');
                    break;
                case 'webp':
                    imgData = canvas.toDataURL('image/webp');
                    break;
                case 'svg':
                    imgData = url;
                    break;
                default:
                    reject(new Error('Image format is not jpeg, png or svg'));
                    // eventually remove the ev
                    //  in favor of promises
                    if(!opts.promise) {
                        return ev.emit('error', 'Image format is not jpeg, png or svg');
                    }
            }
            resolve(imgData);
            // eventually remove the ev
            //  in favor of promises
            if(!opts.promise) {
                ev.emit('success', imgData);
            }
        };

        img.onerror = function(err) {
            reject(err);
            // eventually remove the ev
            //  in favor of promises
            if(!opts.promise) {
                return ev.emit('error', err);
            }
        };

        img.src = url;
    });

    // temporary for backward compatibility
    //  move to only Promise in 2.0.0
    //  and eliminate the EventEmitter
    if(opts.promise) {
        return promise;
    }

    return ev;
}

/**
 * (Private)
 * Writes an image into a canvas taking into
 * account the backing store pixel ratio and
 * the device pixel ratio.
 *
 * @param {Object} opts The params for drawing an image to the canvas
 */
function drawImageForHighDPICanvas(opts) {

    if(!opts.canvas) {
        throw("A canvas is required");
    }
    if(!opts.image) {
        throw("Image is required");
    }

    // get the canvas and context
    var canvas = opts.canvas,
        context = canvas.getContext('2d'),
        image = opts.image,

    // now default all the dimension info
        srcx = opts.srcx || 0,
        srcy = opts.srcy || 0,
        srcw = opts.srcw || image.naturalWidth,
        srch = opts.srch || image.naturalHeight,
        desx = opts.desx || srcx,
        desy = opts.desy || srcy,
        desw = opts.desw || srcw,
        desh = opts.desh || srch,
        auto = opts.auto,

    // finally query the various pixel ratios
        devicePixelRatio = window.devicePixelRatio || 1,
        backingStoreRatio = context.webkitBackingStorePixelRatio ||
                            context.mozBackingStorePixelRatio ||
                            context.msBackingStorePixelRatio ||
                            context.oBackingStorePixelRatio ||
                            context.backingStorePixelRatio || 1,

        ratio = devicePixelRatio / backingStoreRatio;

    // ensure we have a value set for auto.
    // If auto is set to false then we
    // will simply not upscale the canvas
    // and the default behaviour will be maintained
    if (typeof auto === 'undefined') {
        auto = true;
    }

    // upscale the canvas if the two ratios don't match
    if (auto && devicePixelRatio !== backingStoreRatio) {

        var oldWidth = canvas.width;
        var oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        // now scale the context to counter
        // the fact that we've manually scaled
        // our canvas element
        context.scale(ratio, ratio);
    }

    context.drawImage(image, srcx, srcy, srcw, srch, desx, desy, desw, desh);
}

module.exports = svgToImg;
