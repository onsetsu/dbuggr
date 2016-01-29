import uuid from './../src/client/uuid.js';

/**
 * @return {String} The unique id as selector of the created element
 */
export function newWidget(x, y, width, height) {
    var id = 'a' + uuid();
    $('.grid-stack')
        .data('gridstack')
        .add_widget(
        $('<div class="window"><div class="window-titlebar"></div><div id="' + id + '" class="window-content" /></div>'),
        x, y, width, height
    );

    return '#' + id;
}
var options = {
    handle: '.window-titlebar',
    draggable: { handle: '.window-titlebar' },
    cell_height: 80,
    resizable: {
        handles: 'sw, se'
    },
    animate: true
};

let gridElement = document.createElement('div');
gridElement.classList.add("grid-stack");
document.body.appendChild(gridElement);

$(gridElement).gridstack(options);
