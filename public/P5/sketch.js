let cellSize = 18;
let grid;

let sineFactor = 0;

let selectedOption;

let placingElement = null;
let placingName = "";
let placingType = "";
let slider;
let elements;

let selectedInput = null;
let selectedOutput = null;

let connections = [];
let usedInputs = [];
let selectedElements = [];

let dragStartPos = null;
let dragEndPos = null;
let drag = null;

let selectionRectStart = null;
let selectionRectEnd = null;
let selectionInProgress = false;

selected = {
    name: sessionStorage.getItem("selectedOption"),
    type: sessionStorage.getItem("selectedType"),
};

function setup() {
    let holder = document.getElementById("canvasHolder");
    let canvas = createCanvas(holder.offsetWidth, windowHeight - 50, P2D);
    canvas.parent("canvasHolder");

    sessionStorage.setItem("selectedOption", "SELECT");
    sessionStorage.setItem("selectedType", "TOOL");

    grid = new Grid(220);
    elements = [];
}

function draw() {
    RefreshCanvas();
}

function RefreshCanvas() {
    background(235);
    grid.show();

    getPlacingElement();
    placeElement();

    showConnectionInProgress();

    if (connections != null) {
        for (let connection of connections) {
            connection.show();
            connection.updateValues();
        }
    }

    if (elements != null) {
        for (let i = 0; i < elements.length; i++) {
            elements[i].refreshPosition();
            elements[i].show(elements[i].getPosition(), cellSize);
            elements[i].calculateOutput();
        }
    }

    if (selectionInProgress && selectionRectEnd != null) {
        fill(60, 191, 214, 100);
        stroke(60, 191, 214);
        if (
            selectionRectStart.y < selectionRectEnd.y &&
            selectionRectStart.x < selectionRectEnd.x
        ) {
            rect(
                selectionRectStart.x,
                selectionRectStart.y,
                abs(selectionRectEnd.x - selectionRectStart.x),
                abs(selectionRectEnd.y - selectionRectStart.y)
            );
        } else if (
            selectionRectStart.y > selectionRectEnd.y &&
            selectionRectStart.x > selectionRectEnd.x
        ) {
            rect(
                selectionRectEnd.x,
                selectionRectEnd.y,
                abs(selectionRectEnd.x - selectionRectStart.x),
                abs(selectionRectEnd.y - selectionRectStart.y)
            );
        } else if (
            selectionRectStart.y > selectionRectEnd.y &&
            selectionRectStart.x < selectionRectEnd.x
        ) {
            rect(
                selectionRectStart.x,
                selectionRectEnd.y,
                abs(selectionRectEnd.x - selectionRectStart.x),
                abs(selectionRectEnd.y - selectionRectStart.y)
            );
        } else {
            rect(
                selectionRectEnd.x,
                selectionRectStart.y,
                abs(selectionRectEnd.x - selectionRectStart.x),
                abs(selectionRectEnd.y - selectionRectStart.y)
            );
        }
    }

    sineFactor += 0.1;
}

function mousePressed() {
    if (mouseButton === LEFT && selectedOption.name == "SELECT") {
        for (let i = 0; i < elements.length; i++) {
            elements[i].updateJoints();
            let selected = elements[i].checkSelection(
                grid.snapToGrid(createVector(mouseX, mouseY))
            );

            if (selected) {
                dragStartPos = grid.snapToGrid(createVector(mouseX, mouseY));
            }
        }

        if (dragStartPos == null) {
            selectionRectStart = createVector(mouseX, mouseY);
            selectionRectEnd = null;
            selectionInProgress = true;
        }
    }
}

function mouseDragged() {
    if (mouseButton === LEFT && selectedOption.name == "SELECT") {
        if (dragStartPos != null) {
            dragEndPos = grid.snapToGrid(createVector(mouseX, mouseY));

            let currentDrag = createVector(
                dragEndPos.x >= dragStartPos.x
                    ? dragEndPos.x - dragStartPos.x
                    : -dragEndPos.x + dragStartPos.x,
                dragEndPos.y >= dragStartPos.y
                    ? dragEndPos.y - dragStartPos.y
                    : -dragEndPos.y + dragStartPos.y
            );

            for (let i = 0; i < elements.length; i++) {
                if (elements[i].getState() == elementState.Selected) {
                    if (drag != null) {
                        totalDrag = createVector(0, 0);
                        if (dragEndPos.x > elements[i].getPosition().x)
                            totalDrag.x = abs(drag.x - currentDrag.x);
                        else totalDrag.x = -abs(drag.x - currentDrag.x);

                        if (dragEndPos.y > elements[i].getPosition().y)
                            totalDrag.y = abs(drag.y - currentDrag.y);
                        else totalDrag.y = -abs(drag.y - currentDrag.y);

                        elements[i].setPosition(
                            createVector(
                                elements[i].getPosition().x + totalDrag.x,
                                elements[i].getPosition().y + totalDrag.y
                            ),
                            grid.posToCell(
                                createVector(
                                    elements[i].getPosition().x + totalDrag.x,
                                    elements[i].getPosition().y + totalDrag.y
                                )
                            )
                        );
                    }
                }
            }

            drag = currentDrag;
        } else {
            drag = null;
            dragEndPos = null;
        }

        if (selectionInProgress) {
            selectionRectEnd = createVector(mouseX, mouseY);
        }
    }
}

function mouseReleased() {
    dragStartPos = null;
    dragEndPos = null;
    drag = null;
    selectionInProgress = false;
}

function showConnectionInProgress() {
    if (selectedInput != null && selectedOutput == null) {
        stroke(0);
        strokeWeight(4);
        noFill();
        bezier(
            selectedInput.position.x,
            selectedInput.position.y,
            selectedInput.position.x - 3 * cellSize,
            selectedInput.position.y,
            mouseX + 3 * cellSize,
            mouseY,
            mouseX,
            mouseY
        );
    } else if (selectedInput == null && selectedOutput != null) {
        stroke(0);
        strokeWeight(4);
        noFill();
        bezier(
            selectedOutput.position.x,
            selectedOutput.position.y,
            selectedOutput.position.x + 3 * cellSize,
            selectedOutput.position.y,
            mouseX - 3 * cellSize,
            mouseY,
            mouseX,
            mouseY
        );
    } else if (selectedInput != null && selectedOutput != null) {
        connections.push(new Connection(selectedInput, selectedOutput));
        usedInputs.push(selectedInput);
        selectedInput = null;
        selectedOutput = null;
    }
}

function inputIsUsed(input) {
    for (let i = 0; i < usedInputs.length; i++) {
        if (_.isEqual(input, usedInputs[i])) return true;
    }
    return false;
}

function getPlacingElement() {
    selectedOption = {
        name: sessionStorage.getItem("selectedOption"),
        type: sessionStorage.getItem("selectedType"),
    };
    if (selectedOption.name != null && selectedOption.type != null) {
        if (
            selectedOption.type != "TOOL" &&
            placingName != selectedOption.name
        ) {
            placingElement = eval(
                "new " + selectedOption.name.toTitleCase() + "()"
            );
            placingName = selectedOption.name;
            placingType = selectedOption.type;

            selectedInput = null;
            selectedOutput = null;
        } else if (selectedOption.type == "TOOL" && placingName != "") {
            placingElement = null;
            placingName = "";
            placingType = "";

            selectedInput = null;
            selectedOutput = null;
        }
    }
}

function placeElement() {
    if (placingElement != null && mouseInsideCanvas()) {
        placingElement.show(
            grid.snapToGrid(createVector(mouseX, mouseY)),
            cellSize
        );
    }

    if (mouseIsPressed && mouseButton === LEFT) {
        if (placingElement != null && mouseInsideCanvas()) {
            let pos = grid.snapToGrid(createVector(mouseX, mouseY));
            placingElement.setPosition(pos, grid.posToCell(pos));
            let clone = Object.assign(
                Object.create(Object.getPrototypeOf(placingElement)),
                placingElement
            );
            clone.setElementState(elementState.Placed);
            elements.push(clone);
            placingElement = null;
            sessionStorage.setItem("selectedOption", "SELECT");
            sessionStorage.setItem("selectedType", "TOOL");
        }
    }
}

function mouseInsideCanvas() {
    return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function windowResized() {
    let holder = document.getElementById("canvasHolder");
    resizeCanvas(holder.offsetWidth, windowHeight - 50);

    background(248);
    grid.show();
}

function DrawGrid() {
    stroke(220);
    for (let i = 0; i < width; i += cellSize) {
        line(i, 0, i, height);
    }

    for (let i = 0; i < height; i += cellSize) {
        line(0, i, width, i);
    }
}

function mouseWheel(event) {
    if (mouseInsideCanvas()) {
        let delta = event.delta;
        if (delta > 0) {
            delta = -1;
        } else if (delta < 0) {
            delta = 1;
        }

        cellSize += delta;
        cellSize = constrain(cellSize, 10, 30);
    }
}

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

function keyPressed() {
    if (keyCode == ESCAPE) {
        selectedInput = null;
        selectedOutput = null;
    }
}