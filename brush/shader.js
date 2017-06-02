'use strict'

var Shader = (function () {

    function Shader(vertexSource,fragmentSource) {
        this.vertexSource = vertexSource;
        this.fragmentSource = fragmentSource;

        this.uniformsMap = {};
        this.attributeMap = {};
        this.textures = {};
        this.units = {};
        this.unit_counter = 0;
        this.buildShader();
    };

    Shader.prototype.buildShader = function () {
        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
        this.program = gl.createProgram();
        
        // build vertex shader
        gl.shaderSource(this.vertexShader, this.vertexSource);
        gl.compileShader(this.vertexShader);
        if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
            throw "vertShaderError"+gl.getShaderInfoLog(this.vertexShader);
        }

        // build fragment shader
        gl.shaderSource(this.fragmentShader, this.fragmentSource);
        gl.compileShader(this.fragmentShader);
        if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
            throw "fragShaderError" + gl.getShaderInfoLog(this.fragmentShader);
        }

        gl.attachShader(this.program, this.vertexShader);
        gl.attachShader(this.program, this.fragmentShader);
        gl.linkProgram(this.program);

    };

    Shader.prototype.setUniforms = function (uniforms) {
        for (var i = 0; i < uniforms.length; i++) {
            this.setUniform(uniforms[i].name, uniforms[i].type, uniforms[i].value);
        }
    };

    Shader.prototype.setUniform = function (name, type, value) {
        var location = this.getUniformLocation(name);

        switch (type) {
            case 'float': gl.uniform1f(location, value); break;
            case 'vec2': gl.uniform2f(location, value[0], value[1]); break;
            case 'vec3': gl.uniform3f(location, value[0], value[1], value[2]); break;
            case 'vec4': gl.uniform4f(location, value[0], value[1], value[2], value[3]); break;
            case 'mat2': gl.uniformMatrix2fv(location, false, value); break;
            case 'mat3': gl.uniformMatrix3fv(location, false, value); break;
            case 'mat4': gl.uniformMatrix4fv(location, false, value); break;
            default: break;
        }
    };

    Shader.prototype.getUniformLocation = function (name) {
        var location = this.uniformsMap[name];
        if (location === undefined) {
            this.uniformsMap[name] = gl.getUniformLocation(this.program, name);
            location = this.uniformsMap[name];
        }
        return location;
    };

    Shader.prototype.getAttributeLocation = function (name) {
        var location = this.attributeMap[name];
        if (location === undefined) {
            this.attributeMap[name] = gl.getAttribLocation(this.program, name);
            location = this.attributeMap[name];
        }
        return location;
    };

    Shader.prototype.getUnit = function (name) {
        var unit = this.units[name];
        if (unit === undefined) {
            var unit = this.units[name] = this.unit_counter++;
        }
        return unit;
    };

    Shader.prototype.setupTextures = function () {
        for (var name in this.textures) {
            var texture = this.textures[name];
            var unit = this.getUnit(name);
            texture.bind(unit);
        }
    };

    Shader.prototype.sampler = function (name, texture) {
        var unit = this.getUnit(name);
        this.textures[name] = texture;
        texture.bind(unit);
        var location = this.getUniformLocation(name);
        gl.uniform1i(location, unit);
    };
    Shader.prototype.use = function () {
        gl.useProgram(this.program);
        this.setupTextures();
    };

    return Shader;
}());