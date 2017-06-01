'use strict'
var setupCanvas =function(canvas)
{
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
}
var unBindFrameBuffer = function () {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

}
var FrameBuffer = (function () {

    function FrameBuffer() {
        this.id = gl.createFramebuffer();
    };

    FrameBuffer.prototype.bindTexture = function (texture) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.id, 0);
        this.check();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
       // current = null;
        this.width = texture.width;
        this.height = texture.height;
        return this;
    };

    FrameBuffer.prototype.depth = function () {
        var id = this.depthstencil = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, id);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.width, this.height);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, id);
        this.check();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        current = null;
        return this;
    };

    FrameBuffer.prototype.check = function () {
        var result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (result == gl.FRAMEBUFFER_UNSUPPORTED) {
            throw 'Framebuffer is unsupported';
        }
        else if (result == gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
            throw 'Framebuffer incomplete attachment';
        }
        else if (result == gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
            throw 'Framebuffer incomplete dimensions';
        }
        else if (result == gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
            throw 'Framebuffer incomplete missing attachment';
        }
    };

    FrameBuffer.prototype.bind = function () {
            gl.viewport(0, 0, this.width, this.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);
    };


    return FrameBuffer;
}());