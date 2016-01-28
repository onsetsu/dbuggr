import uuid from './../src/client/uuid.js';

/**
 * @return {String} The unique id of the created element
 */
export function newWidget(x, y, width, height) {
    var id = 'a' + uuid();
    $('.grid-stack')
        .data('gridstack')
        .add_widget(
        $('<div><div id="' + id + '" class="grid-stack-item-content" /><div/>'),
        x, y, width, height
    );

    return '#' + id;
}

$(function () {
    var options = {
        cell_height: 80,
        resizable: {
            handles: 'sw, se'
        },
        animate: true
    };
    $('.grid-stack').gridstack(options);

    var items = [
        {x: 0, y: 0, width: 2, height: 2},
        {x: 3, y: 1, width: 1, height: 2},
        {x: 4, y: 1, width: 1, height: 1},
        {x: 2, y: 3, width: 3, height: 1},
        {x: 2, y: 5, width: 1, height: 1}
    ];

    var grid = $('.grid-stack').data('gridstack');
    items.forEach(function(node) {
        grid.add_widget($('<div><div class="grid-stack-item-content" /><div/>'),
            node.x, node.y, node.width, node.height);
    });
});
