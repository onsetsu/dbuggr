import * as dbgr from './dbuggr.js';

/*
d3.select("body").append("svg").append("circle")
    .attr("cx", 30)
    .attr("cy", 30)
    .attr("r", 20)
    .on('contextmenu', function(d,i) {
        // create the div element that will hold the context menu
        d3.selectAll('.context-menu').data([1])
            .enter()
            .append('div')
            .attr('class', 'context-menu');
        // close menu
        d3.select('body').on('click.context-menu', function() {
            d3.select('.context-menu').style('display', 'none');
        });
        // this gets executed when a contextmenu event occurs
        d3.selectAll('.context-menu')
            .html('')
            .append('ul')
            .selectAll('li')
            .data(['apple', 'grapefruit']).enter()
            .append('li')

            .on('click' , function(d) { console.log(d); return d; })


            .text(function(d) { return d; });
        d3.select('.context-menu').style('display', 'none');
        // show the context menu
        d3.select('.context-menu')
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
            .style('display', 'block');
        d3.event.preventDefault();
    });
*/