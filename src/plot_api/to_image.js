/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var isNumeric = require('fast-isnumeric');

var Plotly = require('../plotly');
var Lib = require('../lib');

var helpers = require('../snapshot/helpers');
var clonePlot = require('../snapshot/cloneplot');
var toSVG = require('../snapshot/tosvg');
var svgToImg = require('../snapshot/svgtoimg');

/**
 * @param {object} gd figure Object
 * @param {object} opts option object
 * @param opts.format 'jpeg' | 'png' | 'webp' | 'svg'
 * @param opts.width width of snapshot in px
 * @param opts.height height of snapshot in px
 */
function toImage(gd, opts) {

    // 標準チャートのhoverlayer取得
    // （画像にタイトルなどを含めるため一時的に追加svgのアペンドなどを行う）
    var hoverlayer = gd._fullLayout && gd._fullLayout._hoverlayer ? gd._fullLayout._hoverlayer : null;


    // trello353: レーダーチャート画像
    var radarChartDiv = d3.select('#chart_area > .radarChart')
    if (radarChartDiv.size() > 0) {
      // レーダーチャート専用処理
      // hoverlayer を変更
      hoverlayer = radarChartDiv.select('svg');
      // _fullLayoutをレーダー用に更新
      gd._fullLayout = {
        width: 1135,
        height: 725,
        paper_bgcolor: 'rgb(255, 255, 255)',
        _basePlotModules: [],
        _paper: hoverlayer,
        _toppaper: hoverlayer,
        _hoverlayer: hoverlayer,
      }
      // 画面に画像に入れるためのsvgのlegend追加
      appendLegendForRadarImage(hoverlayer)
    }

    var promise = new Promise(function(resolve, reject) {
        // check for undefined opts
        opts = opts || {};
        // default to png
        opts.format = opts.format || 'png';

        var isSizeGood = function(size) {
            // undefined and null are valid options
            if(size === undefined || size === null) {
                return true;
            }

            if(isNumeric(size) && size > 1) {
                return true;
            }

            return false;
        };

        if(!isSizeGood(opts.width) || !isSizeGood(opts.height)) {
            reject(new Error('Height and width should be pixel values.'));
        }

        // // -- nakamura modified start -------------

        // first clone the GD so we can operate in a clean environment
        // var clone = clonePlot(gd, {format: 'png', height: opts.height, width: opts.width});

        // trello140: ダウンロード画像にタイトル表示
        var chartFormDom = d3.select('#root .chartForm');
        var chartTitleDom = chartFormDom.select('h4');
        var chartTitle = chartTitleDom.empty() ? "" : _.trim(chartTitleDom.text());
        var chartTitleSubDom = chartFormDom.select('p');
        var chartTitleSub = chartTitleSubDom.empty() ? "" : _.trim(chartTitleSubDom.text());

        if (hoverlayer) {
          // 要素としては表示順に作られるよう、:first-childと下部にくるchartTitleSubの要素を先にinsertしている
          // （実際はtranslateで位置が決まるため要素の順序は関係なし）
          var x_value_for_center = Math.round(gd._fullLayout.width / 2);

          // タイトル下の行の文字数を制限する
          var MAX_CHAR_CHART_TITLE_SUB = 70;
          if (chartTitleSub && chartTitleSub.length >= MAX_CHAR_CHART_TITLE_SUB) {
            chartTitleSub = chartTitleSub.substring(0, (MAX_CHAR_CHART_TITLE_SUB - 1)) + '...';
          }

          var Y_VALUE_FOR_CHART_TITLE_SUB = '33';
          hoverlayer.insert("g",":first-child")
            .classed('temp-image-chart-title-sub', true)
            .attr('transform', 'translate(' + x_value_for_center + ',' + Y_VALUE_FOR_CHART_TITLE_SUB + ')')
            .append("text")
              .style("font-size", "11px")
              .style("color", '#000000')
              .attr("text-anchor", "middle")
              .text(chartTitleSub);

          var Y_VALUE_FOR_CHART_TITLE = '20';
          hoverlayer.insert("g",":first-child")
            .classed('temp-image-chart-title', true)
            .attr('transform', 'translate(' + x_value_for_center + ',' + Y_VALUE_FOR_CHART_TITLE + ')')
            .append("text")
              .style("font-size", "15px")
              .style("color", '#000000')
              .attr("text-anchor", "middle")
              .text(chartTitle);
        }

        // var clonedGd = clone.gd;
        var clonedGd = gd;

        // // put the cloned div somewhere off screen before attaching to DOM
        // clonedGd.style.position = 'absolute';
        // clonedGd.style.left = '-5000px';
        // document.body.appendChild(clonedGd);

        // // -- nakamura modified end ---------------

        function wait() {
            var delay = helpers.getDelay(clonedGd._fullLayout);

            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    var svg = toSVG(clonedGd);

                    var canvas = document.createElement('canvas');
                    canvas.id = Lib.randstr();

                    svgToImg({
                        format: opts.format,
                        width: clonedGd._fullLayout.width,
                        height: clonedGd._fullLayout.height,
                        canvas: canvas,
                        svg: svg,
                        // ask svgToImg to return a Promise
                        //  rather than EventEmitter
                        //  leave EventEmitter for backward
                        //  compatibility
                        promise: true
                    }).then(function(url) {
                        // // -- nakamura modified start -------------
                        // if(clonedGd) document.body.removeChild(clonedGd);
                        if (hoverlayer) {
                          hoverlayer.select('g.temp-image-chart-title-sub').remove();
                          hoverlayer.select('g.temp-image-chart-title').remove();
                          hoverlayer.select('g.temp-image-chart-radar-legend').remove();
                        }
                        // // -- nakamura modified end ---------------
                        resolve(url);
                    }).catch(function(err) {
                        if (hoverlayer) {
                          hoverlayer.select('g.temp-image-chart-title-sub').remove();
                          hoverlayer.select('g.temp-image-chart-title').remove();
                          hoverlayer.select('g.temp-image-chart-radar-legend').remove();
                        }
                        reject(err);
                    });

                }, delay);
            });
        }

        // // -- nakamura modified start -------------

        // var redrawFunc = helpers.getRedrawFunc(clonedGd);

        // Plotly.plot(clonedGd, clone.data, clone.layout, clone.config)
        //     .then(redrawFunc)
        //     .then(wait)
        //     .then(function(url) { resolve(url); })
        //     .catch(function(err) {
        //         reject(err);
        //     });

        wait()
            .then(function(url) { resolve(url); })
            .catch(function(err) {
                reject(err);
            });
        // // -- nakamura modified end ---------------
    });

    return promise;
}

function appendLegendForRadarImage(hoverlayer) {

    var radarChartWidth = 400;
    var max_legend_count = 20;
    var max_legend_height = 400;
    var legendOptions;
    var colors_legend;

    // レジェンドの色などはrender_radar.jsでグローバル変数（window.wpobj.view_data）経由で連携
    var view_data = window.wpobj.view_data
    // 連携情報がwindow.wpobj.view_data[0]にない場合、レジェンドをアペンドせず戻る
    if (!view_data
         || !(view_data[0])
         || !(view_data[0].legendOptions)
         || !(view_data[0].colors_legend)) {
        return false;
    }

    if (view_data[0].legendOptions.length > max_legend_count) {
      // 注意：Array.slice(begin[,end])の切出対象、end 自体は含まれず、その直前まで取り出します。
      legendOptions = view_data[0].legendOptions.slice(0, (max_legend_count));
      legendOptions.push('（凡例' + max_legend_count + '件まで表示）');
      colors_legend = view_data[0].colors_legend.slice(0, (max_legend_count));
      colors_legend.push('#fff');
    } else {
      legendOptions = view_data[0].legendOptions;
      colors_legend = view_data[0].colors_legend;
    }

    var legendContainer = hoverlayer.append("g")
      .classed('temp-image-chart-radar-legend', true)
      .attr('transform', "translate(350, 30)");

    var legend = legendContainer.append("g")
      .attr("class", "legend")
      .attr("height", 100)
      .attr("width", 200)
      .attr('transform', 'translate(90,20)');

    //Create colour squares
    legend.selectAll('rect')
      .data(legendOptions)
      .enter()
      .append("rect")
      .attr("x", radarChartWidth - 65)
      .attr("y", function(d, i){ return i * 20;})
      .attr("width", 10)
      .attr("height", 10)
      .style("fill", function(d, i){ return colors_legend[i];});

    //Create text next to squares
    legend.selectAll('text')
      .data(legendOptions)
      .enter()
      .append("text")
      .attr("x", radarChartWidth - 52)
      .attr("y", function(d, i){ return i * 20 + 9;})
      .attr("font-size", "11px")
      .attr("fill", "#737373")
      .text(function(d) { return d; });
}

module.exports = toImage;
