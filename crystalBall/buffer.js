'use strict'
var float_size = Float32Array.BYTES_PER_ELEMENT;
var Pointer = function (name,size,offset) {

    return { "name": name, "size": size, "offset": offset };

};
var ArrayBuffer = (function () {

    function ArrayBuffer(type, stride, pointers, data,indices) {
        this.type = type;
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.pointers = pointers;
        this.stride = stride * float_size;
        this.indices = indices;

        if (indices === undefined)
        {
            this.vertCount = data.length / stride;
        }
        else
        {
            var indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            this.indexBuffer = indexBuffer;
            this.vertCount = indices.length;
        }
    };

    ArrayBuffer.prototype.bind = function (shader) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

        for (var i = 0; i < this.pointers.length; i++) {
            var pointer = this.pointers[i];
            var location = shader.getAttributeLocation(pointer.name);
            if (location >= 0) {
                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(location, pointer.size, gl.FLOAT, false, this.stride, pointer.offset * float_size);
            }
        }

        if (this.indices !== undefined)
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        }
    };
    ArrayBuffer.prototype.draw = function () {
        if (this.indices === undefined)
        {
           
            gl.drawArrays(this.type, 0, this.vertCount);
        }
        else
        {
            gl.drawElements(this.type, this.vertCount, gl.UNSIGNED_SHORT, 0);
        }
    };

    return ArrayBuffer;
}());
