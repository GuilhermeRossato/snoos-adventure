(function () {
    function ne(tag, config, ...content) {
        const el = document.createElement(tag);
        for (var key in config) {
            el.setAttribute(key, config[key])
        }
        if (content) {
            if (!(content instanceof Array)) {
                content = [content]
            }
            content.forEach(c => el.appendChild((typeof (c) === "string") ? document.createTextNode(c) : c))
        }
        return el
    };
    const wrapperClass = "interpolation";
    const inputs = {
        "size": [0, 1].map(number => ne("input", {
            "type": "number",
            "style": "padding:5px;width:100px"
        })),
        "screen": [0, 1].map(number => ne("input", {
            "type": "number",
            "style": "padding:5px;width:100px"
        }))
    };
    const resultElement = ne("pre", {
        "class": wrapperClass + "-result",
        "style": "margin-top:5px;text-align:center"
    }, "Result will show up here");
    const wrapper = ne("div", {
        "class": wrapperClass,
        "style": "display:flex; justify-content:center; align-items:center; background-color:rgba(0,0,0,0.75);width:calc(100vw - 10px);height:100vh;position:fixed;top:0;left:0;overflow:overlay; z-index:1200",
    }, ne("div", {
        "style": "display:flex; flex-direction:column; background-color:#DDD; padding:10px; color:#222;"
    }, ne("div", {
        "class": "header",
        "style": "padding-bottom:5px; border-bottom:1px solid #aaa;display:flex;justify-content:space-between;align-items:center;margin-top:2px;"
    }, ne("h3", {
        "style": "font-size:18px; margin:0; padding:0; color:#000"
    }, "CSS Interpolater"), ne("span", {
        "title": "Fechar",
        "style": "color:red; cursor:pointer; margin-right: 10px;font-weight:bold;font-family:sans-serif;transform:scaleY(0.85);font-size: 18px;",
        "onclick": "document.querySelector('." + wrapperClass + "').remove()"
    }, "X")), ne("p", {
        "style": "margin: 8px 0;"
    }, "Place the values below and get the resulting calc() value below"), ne("div", {
        "style": "display:flex; justify-content:center; align-items:center"
    }, ne("label", {
        "style": "padding:5px"
    }, "Size in pixels"), inputs.size[0], ne("label", {
        "style": "padding:5px"
    }, "Screen Size:"), inputs.screen[0]), ne("div", {
        "style": "display:flex; justify-content:center; align-items:center"
    }, ne("label", {
        "style": "padding:5px"
    }, "Size in pixels"), inputs.size[1], ne("label", {
        "style": "padding:5px"
    }, "Screen Size:"), inputs.screen[1]), resultElement));
    document.body.appendChild(wrapper);

    function process_input_movement(evt) {
        const x0 = parseFloat(inputs.screen[0].value);
        const x1 = parseFloat(inputs.screen[1].value);
        const y0 = parseFloat(inputs.size[0].value);
        const y1 = parseFloat(inputs.size[1].value);
        if (isNaN(x0) || isNaN(x1) || isNaN(y0) || isNaN(y1)) {
            return (resultElement.innerText = "interpolate(" + (isNaN(x0) ? "??" : x0) + ", " + (isNaN(x1) ? "??" : x1) + ", " + (isNaN(y0) ? "??" : y0) + ", " + (isNaN(y1) ? "??" : y1) + ")")
        };
        const delta = (x1 - x0);
        if (delta == 0) {
            return (resultElement.innerText = y0.toFixed(1) + "px")
        };
        const mult = -100 * (y0 - y1) / delta;
        const sum = -(x0 * y1 - x1 * y0) / delta;
        const vw = ((mult.toString().length < mult.toFixed(3).length) ? mult.toString() : mult.toFixed(2)) + "vw";
        const px = ((sum.toString().length < sum.toFixed(1).length) ? sum.toString() : sum.toFixed(1)) + "px";
        if (isNaN(mult)) {
            return (resultElement.innerText = "Multiplier could not be calculated")
        };
        if (isNaN(sum)) {
            return (resultElement.innerText = "Extra pixels could not be calculated")
        };
        resultElement.innerText = (mult > 0) ? "calc(" + vw + " " + px + ")" : "calc(" + px + " " + vw + ")"
    }
    for (var type in inputs) {
        inputs[type].forEach(input => input.addEventListener("change", process_input_movement.bind(input)));
        inputs[type].forEach(input => input.addEventListener("keyup", process_input_movement.bind(input)));
        inputs[type].forEach(input => input.addEventListener("click", process_input_movement.bind(input)))
    }
})();
void null;