'use strict'
var bound = {};
var Texture = (function () {

    function Texture() {
        this.id = gl.createTexture();
        this.linear().repeat();
    };

    Texture.prototype.bind = function (unit) {
        if (unit === undefined) {
            var unit = 0;
        }
        if (bound[unit] !== this) {
            bound[unit] = this;
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, this.id);
        }
        return this;
    };
    Texture.prototype.image = function (image) {
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        return this;
    };
    Texture.prototype.size = function (width, height, type) {
        var type = type === undefined ? gl.UNSIGNED_BYTE : gl[type.toUpperCase()];
        this.bind();
        this.width = width;
        this.height = height;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null);
        return this;
    };
    Texture.prototype.nearest = function () {
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        return this;
    };
    Texture.prototype.linear = function () {
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        return this;
    };
    Texture.prototype.mipmap = function () {
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        return this;
    };
    Texture.prototype.repeat = function () {
        return this.wrap(gl.REPEAT);
    };
    Texture.prototype.repeatMirrored = function () {
        return this.wrap(gl.MIRRORED_REPEAT);

    };
    Texture.prototype.clamp = function () {
        return this.wrap(gl.CLAMP);
    };
    Texture.prototype.borderColor = function (x, y, z, a) {
        this.bind();
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_BORDER_COLOR, x, y, z, a);
        return this;
    };
    Texture.prototype.clampToBorder = function () {
        return this.wrap(gl.CLAMP_TO_BORDER);
    };
    Texture.prototype.clampToEdge = function () {
        return this.wrap(gl.CLAMP_TO_EDGE);
    };
    Texture.prototype.wrap = function (value) {
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, value);
        return this;
    };
    return Texture;
}());