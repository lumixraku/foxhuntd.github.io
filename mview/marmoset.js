marmoset = {};
(function (marmoset) {
    'use strict';

    function Archive(binary) {
        this.files = [];
        var byteStream = new ByteStream(binary);
        while (!byteStream.empty()) {
            var block = {};
            block.name = byteStream.readCString();

            block.type = byteStream.readCString();
            var needDecompress = byteStream.readUint32(),
                length = byteStream.readUint32(),
                decompressedLength = byteStream.readUint32();
            block.data = byteStream.readBytes(length);

            if (block.data.length >= length) {

                if (needDecompress & 1) {
                    block.data = this.decompress(block.data, decompressedLength);
                    if (null !== block.data) {
                        this.files[block.name] = block;
                    }
                } else {
                    this.files[block.name] = block;
                }
            }
        }
    }

    Archive.prototype.get = function (name) {
        return this.files[name]
    };

    Archive.prototype.extract = function (name) {
        var data = this.files[name];
        delete this.files[name];
        return data;
    };

    Archive.prototype.decompress = function (input, dataLength) {
        var result = new Uint8Array(dataLength),
            counter = 0,
            counters = new Uint32Array(4096),
            flags = new Uint32Array(4096),
            s256 = 256,
            k = 0,
            l = 1;
        result[counter++] = input[0];
        var i = 1;
        for (;;) {
            var n = i + (i >> 1);
           //连续两个数字，然后空一个
            if (n + 1 >= input.length) break;
            var m = input[n + 1],
                n = input[n],
                p = i & 1 ? m << 4 | n >> 4 : (m & 15) << 8 | n;

            i++;

            var q;
            var lastCount = counter;
            var flag;
            //如果p< 256可以直接填写
            if (p < 256) {
                flag = 1;
                result[counter++] = p;
            } else {
                if (p > s256) {
                    break;
                }

                if (p == s256) {
                    counters[p] = k;
                    flags[p] = l + 1;
                }

                var start = counters[p];
                var end = start + flags[p];
                flag = flags[p];
                while (start < end) {
                    result[counter++] = result[start++];
                }
            }

            counters[s256] = k;
            flags[s256] = l + 1;
            s256++;
            k = lastCount;
            l = flag;

            if (s256 >=4096) {
                s256 = 256;
            }
        }

        return counter == dataLength ? result : null
    };

    function ByteStream(a) {
        this.bytes = new Uint8Array(a)
    }
    ByteStream.prototype.empty = function () {
        return 0 >= this.bytes.length
    };
    ByteStream.prototype.readCString = function () {
        for (var a = this.bytes, b = a.length, c = 0; c < b; ++c)
            if (0 == a[c]) return a = String.fromCharCode.apply(null, this.bytes.subarray(0, c)), this.bytes = this.bytes.subarray(c + 1), a;
        return null
    };
    ByteStream.prototype.asString = function () {
        for (var a = "", b = 0; b < this.bytes.length; ++b) a += String.fromCharCode(this.bytes[b]);
        return a
    };
    ByteStream.prototype.readBytes = function (a) {
        var b = this.bytes.subarray(0, a);
        this.bytes = this.bytes.subarray(a);
        return b
    };
    ByteStream.prototype.readUint32 = function () {
        var a = this.bytes,
            b = a[0] | a[1] << 8 | a[2] << 16 | a[3] << 24;
        this.bytes = a.subarray(4);
        return b
    };
    var prepareEmbedParams = function (params) {
        params = params || {};
        if (document.location.search) {
            var searches = document.location.search.substring(1).split("&");
            for (var i = 0; i < searches.length; ++i) {
                var param = searches[i].split("=");
                params[param[0]] = param[1];
            }
        }

        var check = function (param) {
            if (param | 0) return true;
            var trues = "true True TRUE yes Yes YES".split(" ");
            for (var i = 0; i < trues.length; ++i) {
                if (param === trues[i]) return true;
            }
            return false
        };
        params.width = params.width || 800;
        params.height = params.height || 600;
        params.autoStart = check(params.autoStart);
        params.pagePreset = check(params.pagePreset);
        params.fullFrame = check(params.fullFrame) || check(params.bare);
        params.fullFrame = !params.pagePreset && params.fullFrame;
        return params;
    };

    var setupShaders = function () {
        ShaderTable["postfrag.glsl"] = marmoset.texts["post.frag"];
    };
    var embed = function (sceneUrl, params) {
        setupShaders();
        var webViwer;
        params = prepareEmbedParams(params);
        var thumbnailURL = params.thumbnailURL;
        if (params.pagePreset) {
            webViwer = new WebViewer(params.width, params.height, sceneUrl, !!thumbnailURL);
            document.body.style.backgroundColor = "#d7e4da";
            var container = document.createElement("div");
            container.style.position = "relative";
            container.style.backgroundColor = "#e4e7e4";
            container.style.width = params.width + 12 + "px";
            container.style.height = params.height + 6 + 16 + "px";
            container.style.margin = "auto";
            container.style.boxShadow = "3px 5px 12px 0px grey";
            document.body.appendChild(container);
            var child = document.createElement("div");
            child.style.position = "relative";
            child.style.left = "6px";
            child.style.top = "6px";
            container.appendChild(child);
            child.appendChild(webViwer.domRoot);

            if (!webViwer.mobile) {
                container.style.resize = "both";
                container.style.overflow = "hidden";
                var size = [container.style.width, container.style.height];
                var setSize = function () {
                    if (FullScreen.active()) {
                        container.style.resize = "none";
                    } else {
                        container.style.resize = "both"
                        if (size[0] != container.style.width || size[1] != container.style.height) {
                            size[0] = container.style.width;
                            size[1] = container.style.height;
                            c.resize(container.clientWidth - 12, container.clientHeight - 6 - 16);
                        }
                    }
                    window.setTimeout(setSize, 100)
                    };
                setSize();
            }
        } else {
            var width = params.fullFrame ? window.innerWidth : params.width,
                height = params.fullFrame ? window.innerHeight : params.height;
            webViwer = new WebViewer(width, height, sceneUrl, !!thumbnailURL);
            document.body.appendChild(webViwer.domRoot);
            if (params.fullFrame) {
                webViwer.domRoot.style.position = "absolute";
                webViwer.domRoot.style.left = webViwer.domRoot.style.top = 0;
                window.addEventListener("resize", function () {
                    FullScreen.active() || webViwer.resize(window.innerWidth, window.innerHeight)
                });
            }
        }

        webViwer.ui.setThumbnailURL(thumbnailURL);
        if (params.autoStart) {
            webViwer.loadScene();
        }
        return webViwer;
    };

    var fetchThumbnail = function (sceneURL, callBack, failCallBack, image) {
        var contact;
        if (-1 == sceneURL.indexOf("?")) {
            contact = "?";
        } else {
            contact = "&";
        }
        Network.fetchBinaryIncremental(sceneURL + contact + "thumb=1", function (result) {
            if (result = new Archive(result).extract("thumbnail.jpg")) {
                TextureCache.parseFile(result, callBack, image);
            } else {
                if (failCallBack) {
                    failCallBack();
                }
            }
            return 0
        }, failCallBack, 71680)
    };


    var marmoset = "undefined" == typeof marmoset ? {} : marmoset;
    marmoset.embed = embed;
    marmoset.fetchThumbnail = fetchThumbnail;


    function Framebuffer(glContext, desc) {
        this.gl = glContext;
        this.fbo = glContext.createFramebuffer();
        glContext.bindFramebuffer(glContext.FRAMEBUFFER, this.fbo);
        if (desc) {
            this.width = desc.width;
            this.height = desc.height;
            if (desc.color0) {
                this.color0 = desc.color0;
                glContext.framebufferTexture2D(glContext.FRAMEBUFFER, glContext.COLOR_ATTACHMENT0, glContext.TEXTURE_2D, this.color0.id, 0);
                this.width = desc.color0.desc.width;
                this.height = desc.color0.desc.height
            }
            if (desc.depth) {
                this.depth = desc.depth;
                glContext.framebufferTexture2D(glContext.FRAMEBUFFER, glContext.DEPTH_ATTACHMENT, glContext.TEXTURE_2D, this.depth.id, 0);
            } else {
                this.depthBuffer = desc.depthBuffer;
                if (desc.createDepth && !this.depthBuffer) {
                    this.depthBuffer = Framebuffer.createDepthBuffer(glContext, this.width, this.height);
                }
                
                if (this.depthBuffer) {
                    glContext.bindRenderbuffer(glContext.RENDERBUFFER, this.depthBuffer);
                    glContext.framebufferRenderbuffer(glContext.FRAMEBUFFER, glContext.DEPTH_ATTACHMENT, glContext.RENDERBUFFER, this.depthBuffer);
                    glContext.bindRenderbuffer(glContext.RENDERBUFFER, null);
                }
            }
        }

        this.valid = desc && desc.ignoreStatus || glContext.checkFramebufferStatus
        glContext.bindFramebuffer(glContext.FRAMEBUFFER, null);
    }

    Framebuffer.createDepthBuffer = function (glContext, width, height) {
        var renderBuffer = glContext.createRenderbuffer();
        glContext.bindRenderbuffer(glContext.RENDERBUFFER, renderBuffer);
        glContext.renderbufferStorage(glContext.RENDERBUFFER, glContext.DEPTH_COMPONENT16, width, height);
        glContext.bindRenderbuffer(glContext.RENDERBUFFER, null);
        return renderBuffer;
    };

    Framebuffer.prototype.bind = function () {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
        this.gl.viewport(0, 0, this.width, this.height);
    };

    Framebuffer.bindNone = function (glContext) {
        glContext.bindFramebuffer(glContext.FRAMEBUFFER, null);
    };

    var FullScreen = {
        support: function () {
            return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled)
        },

        begin: function (doc, change) {
            var fullScreen = doc.requestFullscreen || doc.webkitRequestFullScreen || doc.mozRequestFullScreen || doc.msRequestFullscreen;
            if (fullScreen) {
                var onChange = function () {
                    if(!FullScreen.active()){
                        document.removeEventListener("fullscreenchange", onChange);
                        document.removeEventListener("webkitfullscreenchange", onChange);
                        document.removeEventListener("mozfullscreenchange", onChange);
                        document.removeEventListener("MSFullscreenChange", onChange);
                    }
                    if (change) {
                        change();
                    }
                };
                document.addEventListener("fullscreenchange", onChange);
                document.addEventListener("webkitfullscreenchange", onChange);
                document.addEventListener("mozfullscreenchange", onChange);
                document.addEventListener("MSFullscreenChange", onChange);
                fullScreen.bind(doc)()
            }
        },

        end: function () {
            var fullScreen = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (fullScreen) {
                fullScreen.bind(document)();
            }
        },

        active: function () {
            return !!(document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreenElement || document.msFullscreenElement)
        }

    };

    function Input(ui) {
        this.onTap = [];
        this.onSingleTap = [];
        this.onDoubleTap = [];
        this.onDrag = [];
        this.onZoom = [];
        this.onPan = [];
        this.onPan2 = [];
        this.onAnything = [];
        this.macHax = 0 <= navigator.platform.toUpperCase().indexOf("MAC");
        if (ui) {
            this.attach(ui);
        }
    }
    Input.prototype.attach = function (element) {
        this.element = element;


        var prevent = function (event) {
            for (var i = 0; i < this.onAnything.length; ++i) {
                this.onAnything[i]();
            }
            event.preventDefault();
        }.bind(this);

        this.mouseStates = [{
            pressed: false,
            position: [0, 0],
            downPosition: [0, 0]
        }, {
            pressed: false,
            position: [0, 0],
            downPosition: [0, 0]
        }, {
            pressed: false,
            position: [0, 0],
            downPosition: [0, 0]
        }];

        this.lastTapPos = [0, 0];


        var onMouseDown = function (event) {
            if (event.target === this.element) {
                var mouseState = this.mouseStates[event.button];
                if (mouseState) {
                    mouseState.pressed = true;
                    var bound = this.element.getBoundingClientRect();
                    mouseState.position[0] = mouseState.downPosition[0] =
                        event.clientX - bound.left;
                    mouseState.position[1] = mouseState.downPosition[1] = event.clientY - bound.top;
                    prevent(event);
                }
            }
        }.bind(this);
        this.element.addEventListener("mousedown", onMouseDown);


        var onMouseUp = function (event) {
            var mouseState = this.mouseStates[event.button];
            if (mouseState) {
                var bound = this.element.getBoundingClientRect(),
                    x = event.clientX - bound.left,
                    y = event.clientY - bound.top;
                mouseState.pressed = false;
                mouseState.position[0] = x;
                mouseState.position[1] = y;

                if (0 == event.button && event.target == this.element) {
                    var delta = Math.abs(mouseState.position[0] - mouseState.downPosition[0])
                              + Math.abs(mouseState.position[1] - mouseState.downPosition[1]);
                    if (10 > delta) {
                        for (var i = 0; i < this.onTap.length; ++i) {
                            this.onTap[i](x, y);
                        }

                        this.needSingleClick = true;
                        window.setTimeout(function (a, b) {
                            if (this.needSingleClick) {
                                for (var i = 0; i < this.onSingleTap.length; ++i) {
                                    this.onSingleTap[i](a, b);
                                }
                                this.needSingleClick = false;
                            }
                        }.bind(this, x, y), 301);

                        var doubleClicked = false;
                        if (undefined !== this.doubleClickTimer) {
                            var delta = Math.abs(x - this.lastTapPos[0])
                                      + Math.abs(y - this.lastTapPos[1]);
                            var deltaTime = Date.now() - this.doubleClickTimer;
                            if (300 > deltaTime && 8 > delta) {
                                doubleClicked = true;
                                this.needSingleClick = false;
                                for (var i = 0; i < this.onDoubleTap.length; ++i) {
                                    this.onDoubleTap[i](x, y);
                                }
                            }
                        }

                        this.doubleClickTimer = Date.now();
                        if (doubleClicked) {
                            this.doubleClickTimer = -1E9;
                        }
                        this.lastTapPos[0] = x;
                        this.lastTapPos[1] = y;
                    }
                }
            }
            prevent(event)
        }.bind(this);

        this.element.addEventListener("mouseup", onMouseUp);


        var onMouseMove = function (event) {
            var pressed = false;
            for (var i = 0; 3 > i; ++i) {
                var mouseState = this.mouseStates[i];
                if (mouseState.pressed) {
                    var bound = this.element.getBoundingClientRect(),
                        x = event.clientX - bound.left,
                        y = event.clientY - bound.top,
                        xOffset = x - mouseState.position[0],
                        yOffset = y - mouseState.position[1];
                    mouseState.position[0] = x;
                    mouseState.position[1] = y;
                    if (1 <= i || event.ctrlKey) {
                        for (var j = 0; j < this.onPan.length; ++j) {
                            this.onPan[j](xOffset, yOffset);
                        }
                    }  else if (0 == i) {
                        if (event.shiftKey) {
                            for (var j = 0; j < this.onPan2.length; ++j) {
                                this.onPan2[j](xOffset, yOffset);
                            }

                        } else {
                            for (var j = 0; j < this.onDrag.length; ++j) {
                                this.onDrag[j](x, y, xOffset, yOffset);
                            }
                        }
                    }

                    pressed = true;
                }
            }
            if (pressed) {
                prevent(event);
            }
        }.bind(this);
        this.element.addEventListener("mousemove", onMouseMove);


        var onWheel = function (event) {
            var delta = 0;
            if (event.deltaY) {
                delta = -0.4 * event.deltaY;
                if (1 == event.deltaMode) {
                    delta *= 16;
                } else if (2 == event.deltaMode) {
                    delta *= this.element.clientHeight;
                }
            } else {
                if (event.wheelDelta) {
                    if (this.macHax && 120 == Math.abs(event.wheelDelta)) {
                        delta = 0.08 * event.wheelDelta;
                    } else {
                        delta = 0.4 * event.wheelDelta;
                    }
                } else {
                    if (event.detail) {
                        delta = -10 * event.detail
                    }
                }
            }
            for (var i = 0; i < this.onZoom.length; ++i) {
                this.onZoom[i](delta);
            }
            prevent(event)
        }.bind(this);
        this.element.addEventListener("mousewheel", onWheel);
        this.element.addEventListener("DOMMouseScroll", onWheel);
        this.element.addEventListener("wheel", onWheel);

        var onMouseLeave = function (event) {
            for (var i = 0; i < this.mouseStates.length; ++i) {
                this.mouseStates[i].pressed = false;
            }
            event.preventDefault()
        }.bind(this);
        this.element.addEventListener("mouseleave", onMouseLeave);
        this.element.addEventListener("contextmenu", function (event) {
            event.preventDefault()
        });
        this.touches = {};
        this.tapPossible = false;
        this.touchCountFloor = 0;


        var onTouchStart = function (event) {
            var bound = this.element.getBoundingClientRect();
            var touched = false;
            for (var i = 0; i < event.changedTouches.length; ++i) {
                if (event.target === this.element) {
                    var changedTouch = event.changedTouches[i],
                        pos = {
                            x: changedTouch.clientX - bound.left,
                            y: changedTouch.clientY - bound.top
                        };
                    pos.startX = pos.x;
                    pos.startY = pos.y;
                    this.touches[changedTouch.identifier] = pos;
                    touched = true;
                }
            }
            this.tapPossible = 1 == event.touches.length;
            var touchedFloor = 0;
            for (var i; i < this.touches.length; ++i) {
                touchedFloor++;
            }

            if (touchedFloor > this.touchCountFloor) {
                this.touchCountFloor = touchedFloor;
            }

            if (touched) {
                prevent(event);
            }
        }.bind(this);
        this.element.addEventListener("touchstart", onTouchStart);


        var onTouchEnd = function (event) {
            var taped = false;
            for (var i = 0; i < event.changedTouches.length; ++i) {
                var changedTouch = event.changedTouches[i],
                    touch = this.touches[changedTouch.identifier];
                if (touch) {
                    if (this.tapPossible) {
                        var bound = this.element.getBoundingClientRect(),
                            x = changedTouch.clientX - bound.left,
                            y = changedTouch.clientY - bound.top;
                        var maxDistance = Math.max(Math.abs(x - touch.startX),
                                                   Math.abs(y - touch.startY));
                        if (24 > maxDistance) {
                            for (var i = 0; i < this.onTap.length; ++i) {
                                this.onTap[i](x, y);
                            }
                            this.needSingleTap = true;
                            window.setTimeout(function (a, b) {
                                if (this.needSingleTap) {
                                    for (var i = 0; i < this.onSingleTap.length; ++i) {
                                        this.onSingleTap[i](a, b);
                                    }
                                    this.needSingleTap = false;
                                }
                            }.bind(this, x, y), 501);
                            var doubleTapped = false;

                            if (undefined !== this.doubleTapTimer) {
                                var deltaDistance = Math.max(Math.abs(x - this.lastTapPos[0]),
                                                             Math.abs(y - this.lastTapPos[1])),
                                    deltaTime =  Date.now() - this.doubleTapTimer;
                                if (24 > deltaDistance && 500 > deltaTime) {
                                    doubleTapped = true;
                                    for (var i = 0; i < this.onDoubleTap.length; ++i) {
                                        this.onDoubleTap[i](x, y);
                                    }
                                }
                            }
                            this.doubleTapTimer = Date.now();
                            if (doubleTapped) {
                                this.doubleTapTimer = -1E9;
                            }
                            this.lastTapPos[0] = x;
                            this.lastTapPos[1] = y;
                        }
                        this.tapPossible = false;
                    }
                    delete this.touches[changedTouch.identifier];
                    taped = true;
                }
            }
            var count = 0;
            for (var i; i < this.touches.length; ++i) {
                count++;
            }
            if (0 >= count) {
                this.touchCountFloor = 0;
            }
            if (taped) {
                prevent(event);
            }
        }.bind(this);
        this.element.addEventListener("touchend", onTouchEnd);
        this.element.addEventListener("touchcancel", onTouchEnd);
        this.element.addEventListener("touchleave", onTouchEnd);


        var onTouchMove = function (a) {
            var d = [];
            for (var i = 0; i < a.touches.length; ++i) {
                if (a.touches[i].target === this.element) {
                    d.push(a.touches[i]);
                }
            }
            var f = this.element.getBoundingClientRect();
            if (1 == d.length && 1 >= this.touchCountFloor) {
                var g = d[0],
                    h = this.touches[g.identifier];
                if (h) {
                    var k = g.clientX - f.left,
                        g = g.clientY - f.top,
                        f = k - h.x,
                        l = g - h.y;
                    h.x = k;
                    h.y = g;
                    for (var i = 0; i < this.onDrag.length; ++i) {
                        this.onDrag[i](k, g, f, l, a.shiftKey);
                    }
                }
            } else if (2 == d.length && 2 >= this.touchCountFloor) {
                l = d[0];
                e = this.touches[l.identifier];
                g = d[1];
                h = this.touches[g.identifier];
                if ( e && h) {
                    var k = l.clientX - f.left,
                        l = l.clientY - f.top,
                        m = g.clientX - f.left,
                        n = g.clientY - f.top,
                        r = Math.sqrt((k - m) * (k - m) + (l - n) * (l - n)),
                        p = Math.sqrt((e.x - h.x) * (e.x - h.x) + (e.y - h.y) * (e.y - h.y)),
                        q = Math.abs(r - p),
                        f = (k - e.x + m - h.x) / 2,
                        g = (l - e.y + n - h.y) / 2,
                        u = Math.sqrt(f * f + g * g);
                    e.x = k;
                    e.y = l;
                    h.x = m;
                    h.y = n;
                    if (0 < q) {
                        h = q / (q + u);
                        for (var i = 0; i < this.onZoom.length; ++i) {
                            this.onZoom[i](2 * (r - p) * h);
                        }
                    }
                    if (0 < u) {
                        h = u / (q + u);
                        for (var i = 0; i < this.onDrag.length; ++i) {
                            this.onPan[i](f * h, g * h);
                        }
                    }
                }
            } else if (3 <= d.length) {
                p = r = m = l = 0
                for (var i = 0; i < d.length; ++i) {
                    g = d[i];
                    h = this.touches[g.identifier];
                    k = g.clientX - f.left;
                    g = g.clientY - f.top;
                    r += k;
                    p += g;
                    if (h) {
                        l += h.x;
                        m += h.y;
                        h.x = k;
                        h.y = g;
                    }
                }

                l /= d.length;
                m /= d.length;
                r /= d.length;
                p /= d.length;
                for (var i = 0; i < this.onPan2.length; ++i) {
                    this.onPan2[i](r - l, p - m);
                }
            }
            if (0 < d.length) {
                prevent(a);
            }
        }.bind(this);
        this.element.addEventListener("touchmove", onTouchMove);
    };

    //decoded
    function Lights(lights, view) {
        this.rotation = this.shadowCount = this.count = 0;
        this.positions = [];
        this.directions = [];
        this.matrixWeights = [];
        this.matrix = Matrix.identity();
        this.invMatrix = Matrix.identity();
        //count,shadowcounts
        for (var i in lights) {
            this[i] = lights[i];
        }

        this.count = this.positions.length / 4;
        this.count = Math.min(6, this.count);
        this.shadowCount = Math.min(3, this.shadowCount);
        this.positions = new Float32Array(this.positions);
        this.positionBuffer = new Float32Array(this.positions);
        this.directions = new Float32Array(this.directions);
        this.directionBuffer = new Float32Array(this.directions);
        this.modelViewBuffer = new Float32Array(16 * this.shadowCount);
        this.projectionBuffer = new Float32Array(16 * this.shadowCount);
        this.finalTransformBuffer = new Float32Array(16 * this.shadowCount);
        this.inverseTransformBuffer = new Float32Array(16 * this.shadowCount);
        this.shadowTexelPadProjections = new Float32Array(4 * this.shadowCount);
        this.shadowsNeedUpdate = new Uint8Array(this.shadowCount);
        for (var i = 0; i < this.shadowsNeedUpdate.length; ++i) {
            this.shadowsNeedUpdate[i] = 1;
        }
        Matrix.rotation(this.matrix, this.rotation, 1);
        Matrix.transpose(this.invMatrix, this.matrix);
        for (var i = 0; i < this.count; ++i) {
            var pos = this.positions.subarray(4 * i, 4 * i + 4);
            var dir = this.directions.subarray(3 * i, 3 * i + 3);
            if (1 == this.matrixWeights[i]) {
                Matrix.mul4(pos, this.matrix, pos[0], pos[1], pos[2], pos[3]);
                Matrix.mulVec(dir, this.matrix, dir[0], dir[1], dir[2]);
            } else if(2 == this.matrixWeights[i]) {
                Matrix.mul4(pos, view.viewMatrix, pos[0], pos[1], pos[2], pos[3]);
                Matrix.mulVec(dir, view.viewMatrix, dir[0], dir[1], dir[2]);
            }
        }
    }
    Lights.prototype.getLightPos = function (i) {
        return this.positionBuffer.subarray(4 * i, 4 * i + 4)
    };
    Lights.prototype.getLightDir = function (i) {
        return this.directionBuffer.subarray(3 * i, 3 * i + 3)
    };
    Lights.prototype.update = function (view, bounds) {
        var c = new Matrix.type(this.matrix);
        Matrix.rotation(this.matrix, this.rotation, 1);
        Matrix.transpose(this.invMatrix, this.matrix);
        for (var d = 0; d < this.count; ++d) {
            var e = this.positions.subarray(4 * d, 4 * d + 4),
                f = this.directions.subarray(3 * d, 3 * d + 3),
                g = this.getLightPos(d),
                h = this.getLightDir(d);
            if(1 == this.matrixWeights[d]) {
                g[0] = e[0];
                g[1] = e[1];
                g[2] = e[2];
                g[3] = e[3];
                h[0] = f[0];
                h[1] = f[1];
                h[2] = f[2];
            } else if (2 == this.matrixWeights[d]) {
                Matrix.mul4(g, a.transform, e[0], e[1], e[2], e[3]);
                Matrix.mulVec(h, view.transform, f[0], f[1], f[2]);
                Matrix.mul4(g, this.matrix, g[0], g[1], g[2], g[3]);
                Matrix.mulVec(h, this.matrix, h[0], h[1], h[2]);
            } else {
                Matrix.mul4(g, this.matrix, e[0], e[1], e[2], e[3]);
                Matrix.mulVec(h, this.matrix, f[0], f[1], f[2]);
            }
            Vect.normalize(h, h)
        }
        var f = new Float32Array(this.finalTransformBuffer);
        g = Matrix.empty();
        h = Matrix.empty();
        var k = Matrix.empty();
        l = Vect.empty();
        m = Vect.empty();
        var n = Vect.empty();
        var r = Vect.empty();
        e = Vect.empty();
        var p = [];
        var q = [];
        var u = Matrix.create(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
        for (var d = 0; d < this.count; ++d) {
            l = this.getLightPos(d);
            m = this.getLightDir(d);
            0.99 < Math.abs(m[1]) ? Vect.set(n, 1, 0, 0) : Vect.set(n, 0, 1, 0);
            Vect.cross(r, n, m);
            Vect.normalize(r, r);
            Vect.cross(n, m, r);
            Vect.normalize(n, n);
            Matrix.set(g, r[0], r[1], r[2], -Vect.dot(r, l), n[0], n[1], n[2], -Vect.dot(n, l), m[0], m[1], m[2], -Vect.dot(m, l), 0, 0, 0, 1);
            for (l = 0; 8 > l; ++l) {
                e[0] = l & 1 ? bounds.max[0] : bounds.min[0];
                e[1] = l & 2 ? bounds.max[1] : bounds.min[1];
                e[2] = l & 4 ? bounds.max[2] : bounds.min[2];
                Matrix.mulPoint(e, this.matrix, 1.005 * e[0], 1.005 * e[1], 1.005 * e[2]);
                Matrix.mulPoint(e, g, e[0], e[1], e[2]);
                if (0 == l) {
                    p[0] = q[0] = e[0];
                    p[1] = q[1] = e[1];
                    p[2] = q[2] = e[2];
                } else {
                    p[0] = Math.min(p[0], e[0]);
                    p[1] = Math.min(p[1], e[1]);
                    p[2] = Math.min(p[2], e[2]);
                    q[0] = Math.max(q[0], e[0]);
                    q[1] = Math.max(q[1], e[1]);
                    q[2] = Math.max(q[2], e[2]);
                }
            }
            var l = -p[2],
                m = -q[2],
                s = this.spot[3 * d];
            if (0 < s) {

                l = Math.min(l, 1 / this.parameters[3 * d + 2]);
                m = Math.max(0.005 * l, m);
                Matrix.perspective(h, s, 1, m, l);
                if(d < this.shadowCount){
                    l = 2 * -Math.tan(0.00872664625 * s);
                }
                this.shadowTexelPadProjections[4 * d + 0] = this.modelViewBuffer[16 * d + 2] * l;
                this.shadowTexelPadProjections[4 * d + 1] = this.modelViewBuffer[16 * d + 6] * l;
                this.shadowTexelPadProjections[4 * d + 2] = this.modelViewBuffer[16 * d + 10] * l;
                this.shadowTexelPadProjections[4 * d + 3] = this.modelViewBuffer[16 * d + 14] * l;
            } else {
                Matrix.ortho(h, p[0], q[0], p[1], q[1], m, l);
                if (d < this.shadowCount) {
                    this.shadowTexelPadProjections[4 * d + 0] = this.shadowTexelPadProjections[4 * d + 1] = this.shadowTexelPadProjections[4 * d + 2] = 0;
                    this.shadowTexelPadProjections[4 * d + 3] = Math.max(q[0] - p[0], q[1] - p[1]);
                }
            }

            Matrix.mul(k, h, g);

            Matrix.mul(k, u, k);
            Matrix.copyToBuffer(this.modelViewBuffer, 16 * d, g);
            Matrix.copyToBuffer(this.projectionBuffer, 16 * d, h);
            Matrix.copyToBuffer(this.finalTransformBuffer, 16 * d, k);
            
            /*
            var mvpM = Matrix.empty();
            Matrix.mul(mvpM, h, g);
            //Matrix.mul(mvpM, u, mvpM);
            mvpM = h;
            var mm = [];

            var ssss1 = "";
            for (var i = 0; i < h.length; i++) {
                ssss1 += h[i];
                ssss1 += ";";
            }
            alert(ssss1);
            Matrix.mul4(mm, mvpM, 1.0128428936004639, -4.085239410400391, -29.22303581237793, 1.);
            //Matrix.mul(mm, h, mm);
            var ssss = "";
            for (var i = 0; i < mm.length; i++) {
                ssss += mm[i];
                ssss +=";";
            }
            alert(ssss);
            */
            Matrix.invert(k, k);
            Matrix.copyToBuffer(this.inverseTransformBuffer, 16 * d, k);
        }
        e = false;
        for (d = 0; d < c.length; ++d){
            if (c[d] != this.matrix[d]) {
                e = true;
                break;
            }
        }

        for (d = 0; d < this.shadowCount; d++) {
            if (e && 1 == this.matrixWeights[d]) {
                this.shadowsNeedUpdate[d] = 1;
            } else {
                for (c = 16 * d; c < 16 * d + 16; ++c) {
                    if (f[c] != this.finalTransformBuffer[c]) {
                        this.shadowsNeedUpdate[d] = 1;
                        break;
                    }
                }
            }
        }

    };

    function Material(glContext, achieve, material) {
        this.gl = glContext;
        this.name = material.name;
        var desc = {
            mipmap: true,
            aniso: glContext.hints.mobile ? 0 : 4,
            clamp: !!material.textureWrapClamp,
            mirror: !!material.textureWrapMirror
        };
        var desc2 = {
            mipmap: desc.mipmap,
            clamp: desc.clamp,
            mirror: desc.mirror,
            nofilter: material.textureFilterNearest || false
        };
        if(!desc2.nofilter){
            desc2.aniso = glContext.hints.mobile ? 2 : 4;
        }
        this.textures = {
            albedo: glContext.textureCache.fromFilesMergeAlpha(achieve.get(material.albedoTex), achieve.get(material.alphaTex), desc2),
            reflectivity: glContext.textureCache.fromFilesMergeAlpha(achieve.get(material.reflectivityTex), achieve.get(material.glossTex), desc),
            normal: glContext.textureCache.fromFile(achieve.get(material.normalTex), desc),
            extras: glContext.textureCache.fromFilesMergeAlpha(achieve.get(material.extrasTex), achieve.get(material.extrasTexA), desc)
        };
        this.extrasTexCoordRanges = {};
        if (material.extrasTexCoordRanges) {
            for (var i in material.extrasTexCoordRanges) {
                this.extrasTexCoordRanges[i] = new Float32Array(material.extrasTexCoordRanges[i].scaleBias);
            }
        }
        if (!this.textures.extras) {
            var tex = new Texture(glContext, {
                width: 1,
                height: 1
            });
            tex.loadArray(new Uint8Array([255, 255, 255, 255]));
            this.textures.extras = tex;
        }

        var blendColor = material.blendTint || [1, 1, 1];
        var blendMode = {
            none: function () {
                glContext.disable(glContext.BLEND);
            },
            alpha: function () {
                glContext.enable(glContext.BLEND);
                glContext.blendFuncSeparate(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA, glContext.ONE_MINUS_DST_ALPHA, glContext.ONE);
            },
            add: function () {
                glContext.enable(glContext.BLEND);
                glContext.blendColor(blendColor[0], blendColor[1], blendColor[2], 1);
                glContext.blendFunc(glContext.ONE, glContext.CONSTANT_COLOR);
            }
        };
        this.blend = blendMode[material.blend] || blendMode.none;
        this.alphaTest = material.alphaTest || 0;
        this.usesBlending = this.blend !== blendMode.none;
        this.shadowAlphaTest = this.alphaTest;

        if (this.shadowAlphaTest <= 0 && this.blend === blendMode.alpha) {
            this.shadowAlphaTest = 0.5;
        }

        this.castShadows = this.blend !== blendMode.add;
        this.horizonOcclude = material.horizonOcclude || 0;
        this.fresnel = new Float32Array(material.fresnel ? material.fresnel : [1, 1, 1]);
        this.emissiveIntensity = material.emissiveIntensity || 1;
        var prefix = [];

        if(0 < material.lightCount){
            prefix.push("#define LIGHT_COUNT " + material.lightCount);
        }

        if(0 < material.shadowCount){
            prefix.push("#define SHADOW_COUNT " + Math.min(material.lightCount, material.shadowCount));
        }

        if(0 < material.alphaTest){
            prefix.push("#define ALPHA_TEST");
        }

        if (this.blend === blendMode.alpha) {
            prefix.push("#define TRANSPARENCY_DITHER")
        } else {
            this.blend === blendMode.none && prefix.push("#define NOBLEND");
        }

        if (glContext.hints.mobile) {
            prefix.push("#define MOBILE");
        }

        var f = function (a) {
            return 1 / (2 / 3 * 3.1415962 * (a * a + a + 1))
        };

        if (material.useSkin) {
            prefix.push("#define SKIN");
            this.skinParams = material.skinParams || {
                subdermisColor: [1, 1, 1],
                transColor: [1, 0, 0, 1],
                fresnelColor: [0.2, 0.2, 0.2, 0.5],
                fresnelOcc: 1,
                fresnelGlossMask: 1,
                transSky: 0.5,
                shadowBlur: 0.5,
                normalSmooth: 0.5,
                transScatter: 0,
                transDepth: 0,
                millimeterScale: 1
            };
            if(!this.extrasTexCoordRanges.subdermisTex) {
                prefix.push("#define SKIN_NO_SUBDERMIS_TEX");
            }
            if(!this.extrasTexCoordRanges.translucencyTex){
                prefix.push("#define SKIN_NO_TRANSLUCENCY_TEX");
            }
            if(!this.extrasTexCoordRanges.fuzzTex){
                prefix.push("#define SKIN_NO_FUZZ_TEX")
            }
            if(undefined === this.skinParams.version){
                (this.skinParams.version = 1)
            }
            if (2 == this.skinParams.version) {
                prefix.push("#define SKIN_VERSION_2");
                this.skinParams.shadowBlur *= 4;
                this.skinParams.shadowBlur = Math.min(this.skinParams.shadowBlur, 40);
                this.skinParams.transIntegral = f(0.5 * this.skinParams.transScatter);
                this.skinParams.fresnelIntegral = 1 / 3.14159 * (1 - 0.5 * this.skinParams.fresnelColor[3]);
                this.skinParams.transSky = 0;
            } else {
                prefix.push("#define SKIN_VERSION_1");
                this.skinParams.shadowBlur = 8 * Math.min(this.skinParams.shadowBlur, 1);
                this.skinParams.transDepth = 0;
                this.skinParams.transScatter = this.skinParams.transColor[3];
                this.skinParams.transIntegral = 1 / 3.14159 * (1 - 0.5 * this.skinParams.transScatter);
                this.skinParams.fresnelIntegral = 1 / 3.14159 * (1 - 0.5 * this.skinParams.fresnelColor[3]);
                this.skinParams.transSky *= 1.25;
                this.skinParams.transIntegral *= 1.25;
            }
        }

        if (material.aniso)
        {
            prefix.push("#define ANISO");
            this.anisoParams = material.anisoParams || {
                strength: 1,
                tangent: [1, 0, 0],
                integral: 0.5
            };
            if (!this.extrasTexCoordRanges.anisoTex) {
                prefix.push("#define ANISO_NO_DIR_TEX");
            }
        }

        if (material.microfiber) {
            prefix.push("#define MICROFIBER");
            this.microfiberParams = material.microfiberParams || {
                fresnelColor: [0.2, 0.2, 0.2, 0.5],
                fresnelOcc: 1,
                fresnelGlossMask: 1
            };
            this.microfiberParams.fresnelIntegral = 1 / 3.14159 * (1 - 0.5 * this.microfiberParams.fresnelColor[3]);
            if (!this.extrasTexCoordRanges.fuzzTex) {
                prefix.push("#define MICROFIBER_NO_FUZZ_TEX");
            }
        }

        if(material.vertexColor) {
            prefix.push("#define VERTEX_COLOR");
            if (material.vertexColorsRGB) {
                prefix.push("#define VERTEX_COLOR_SRGB");
            }
            if (material.vertexColorAlpha) {
                prefix.push("#define VERTEX_COLOR_ALPHA");
            }
        }

        this.horizonSmoothing = material.horizonSmoothing || 0;
        if (0 < this.horizonSmoothing) {
            prefix.push("#define HORIZON_SMOOTHING");
        }

        if (material.unlitDiffuse) {
            prefix.push("#define DIFFUSE_UNLIT");
        }

        var secondUV;
        if (this.extrasTexCoordRanges.emissiveTex) {
            prefix.push("#define EMISSIVE");
            if (material.emissiveSecondaryUV) {
                prefix.push("#define EMISSIVE_SECONDARY_UV");
            }
            secondUV = true;
        };

        if (this.extrasTexCoordRanges.aoTex) {
            if (prefix.push("#define AMBIENT_OCCLUSION")) {
                if(material.aoSecondaryUV) {
                    prefix.push("#define AMBIENT_OCCLUSION_SECONDARY_UV");
                    secondUV = true;
                }
            }
        }

        if (material.tangentOrthogonalize) {
            prefix.push("#define TSPACE_ORTHOGONALIZE");
        }

        if (material.tangentNormalize) {
            prefix.push("#define TSPACE_RENORMALIZE");
        }

        if (material.tangentGenerateBitangent) {
            prefix.push("#define TSPACE_COMPUTE_BITANGENT");
        }

        if (secondUV) {
            prefix.push("#define TEXCOORD_SECONDARY");
        }

        this.shader = glContext.shaderCache.fromURLs("matvert.glsl", "matfrag.glsl", prefix,true);
        prefix.push("#define STRIPVIEW");
        this.stripShader = glContext.shaderCache.fromURLs("matvert.glsl", "matfrag.glsl", prefix);
        this.wireShader = glContext.shaderCache.fromURLs("wirevert.glsl", "wirefrag.glsl");
        if (this.blend === blendMode.alpha) {
            this.prepassShader = glContext.shaderCache.fromURLs("alphaprepassvert.glsl", "alphaprepassfrag.glsl");
        }
    }

    Material.prototype.bind = function (scene) {
        if (!this.complete()) return false;
        var view = scene.view,
            lights = scene.lights,
            sky = scene.sky,
            shadow = scene.shadow,
            shader = scene.stripData.active() ? this.stripShader : this.shader,
            skinParams = this.skinParams,
            anisoParams = this.anisoParams,
            microfiberParams = this.microfiberParams,
            glContext = this.gl,
            params = shader.params,
            textures = this.textures,
            samplers = shader.samplers;
        shader.bind();
        this.blend();

        var mvpMatrix = Matrix.mul(Matrix.empty(), view.projectionMatrix, view.viewMatrix);
        glContext.uniformMatrix4fv(params.uModelViewProjectionMatrix, false, mvpMatrix);
        glContext.uniformMatrix4fv(params.uSkyMatrix, false, lights.matrix);

        var cameraPos = Matrix.mulPoint(Vect.empty(), lights.matrix, view.transform[12],
            view.transform[13], view.transform[14]);
        glContext.uniform3f(params.uCameraPosition, cameraPos[0], cameraPos[1], cameraPos[2]);
        glContext.uniform3fv(params.uFresnel, this.fresnel);
        glContext.uniform1f(params.uAlphaTest, this.alphaTest);
        glContext.uniform1f(params.uHorizonOcclude, this.horizonOcclude);
        glContext.uniform1f(params.uHorizonSmoothing, this.horizonSmoothing);
        glContext.uniform4fv(params.uDiffuseCoefficients, sky.diffuseCoefficients);

        //光
        if(0 < lights.count) { 
            glContext.uniform4fv(params.uLightPositions, lights.positionBuffer);
            glContext.uniform3fv(params.uLightDirections, lights.directionBuffer);
            glContext.uniform3fv(params.uLightColors, lights.colors);
            glContext.uniform3fv(params.uLightParams, lights.parameters);
            glContext.uniform3fv(params.uLightSpot, lights.spot);
            var kernelAngle = 0.392699 * scene.postRender.sampleIndex;
            glContext.uniform2f(params.uShadowKernelRotation, 0.5 * Math.cos(kernelAngle), 0.5 * Math.sin(kernelAngle));
        }

        //阴影贴图
        if (0 < lights.shadowCount) {
            var width = shadow.depthTextures[0].desc.width,
                height = shadow.depthTextures[0].desc.height;
            glContext.uniform4f(params.uShadowMapSize, width, height, 1 / width, 1 / height);
            glContext.uniformMatrix4fv(params.uShadowMatrices, false, lights.finalTransformBuffer);
            glContext.uniformMatrix4fv(params.uInvShadowMatrices, false, lights.inverseTransformBuffer);
            glContext.uniform4fv(params.uShadowTexelPadProjections, lights.shadowTexelPadProjections);
            shadow.bindDepthTexture(samplers.tDepth0, 0);
            shadow.bindDepthTexture(samplers.tDepth1, 1);
            shadow.bindDepthTexture(samplers.tDepth2, 2)
        }

        if (skinParams) {
            glContext.uniform3fv(params.uSubdermisColor, skinParams.subdermisColor);
            glContext.uniform4fv(params.uTransColor, skinParams.transColor);
            glContext.uniform1f(params.uTransScatter, skinParams.transScatter);
            glContext.uniform4fv(params.uFresnelColor, skinParams.fresnelColor);
            glContext.uniform1f(params.uFresnelOcc, skinParams.fresnelOcc);
            glContext.uniform1f(params.uFresnelGlossMask, skinParams.fresnelGlossMask);
            glContext.uniform1f(params.uFresnelIntegral, skinParams.fresnelIntegral);
            glContext.uniform1f(params.uTransIntegral, skinParams.transIntegral);
            glContext.uniform1f(params.uSkinTransDepth, skinParams.transDepth);
            glContext.uniform1f(params.uTransSky, skinParams.transSky);
            glContext.uniform1f(params.uSkinShadowBlur, skinParams.shadowBlur);
            glContext.uniform1f(params.uNormalSmooth, skinParams.normalSmooth);
            if (this.extrasTexCoordRanges.subdermisTex) {
                glContext.uniform4fv(params.uTexRangeSubdermis, this.extrasTexCoordRanges.subdermisTex);
            }
            if (this.extrasTexCoordRanges.translucencyTex) {
                glContext.uniform4fv(params.uTexRangeTranslucency, this.extrasTexCoordRanges.translucencyTex);
            }
            if (this.extrasTexCoordRanges.fuzzTex) {
                glContext.uniform4fv(params.uTexRangeFuzz, this.extrasTexCoordRanges.fuzzTex);
            }
        }

        if (microfiberParams) {
            glContext.uniform4fv(params.uFresnelColor, microfiberParams.fresnelColor);
            glContext.uniform1f(params.uFresnelOcc, microfiberParams.fresnelOcc);
            glContext.uniform1f(params.uFresnelGlossMask, microfiberParams.fresnelGlossMask);
            glContext.uniform1f(params.uFresnelIntegral, microfiberParams.fresnelIntegral);
            if (this.extrasTexCoordRanges.fuzzTex) {
                glContext.uniform4fv(params.uTexRangeFuzz, this.extrasTexCoordRanges.fuzzTex);
            }
        }

        if (anisoParams) {
            glContext.uniform3fv(params.uAnisoTangent, anisoParams.tangent);
            glContext.uniform1f(params.uAnisoStrength, anisoParams.strength);
            glContext.uniform1f(params.uAnisoIntegral, anisoParams.integral);
            if (this.extrasTexCoordRanges.anisoTex) {
                glContext.uniform4fv(params.uTexRangeAniso, this.extrasTexCoordRanges.anisoTex);
            }
        }

        if (this.extrasTexCoordRanges.emissiveTex) {
            glContext.uniform4fv(params.uTexRangeEmissive, this.extrasTexCoordRanges.emissiveTex);
            glContext.uniform1f(params.uEmissiveScale, this.emissiveIntensity);
        }

        if (this.extrasTexCoordRanges.aoTex) {
            glContext.uniform4fv(params.uTexRangeAO, this.extrasTexCoordRanges.aoTex);
        }

        textures.albedo.bind(samplers.tAlbedo);
        textures.reflectivity.bind(samplers.tReflectivity);
        textures.normal.bind(samplers.tNormal);
        textures.extras.bind(samplers.tExtras);

        sky.specularTexture.bind(samplers.tSkySpecular);

        if (shader === this.stripShader) {
            glContext.uniform1fv(params.uStrips, scene.stripData.strips);
            glContext.uniform2f(params.uStripRes, 2 / view.size[0], 2 / view.size[1]);
        }

        return true;
    };

    Material.prototype.bindAlphaPrepass = function (scene) {
        if (!this.complete() || !this.prepassShader) return false;
        var glContext = this.gl,
            params = this.prepassShader.params,
            samplers = this.prepassShader.samplers;
        this.prepassShader.bind();
        var mvpMatrix = Matrix.mul(Matrix.empty(), scene.view.projectionMatrix, scene.view.viewMatrix);
        glContext.uniformMatrix4fv(params.uModelViewProjectionMatrix, false, mvpMatrix);
        this.textures.albedo.bind(samplers.tAlbedo);
        return true;
    };

    Material.prototype.bindWire = function (scene) {
        if (!this.complete()) return false;
        var glContext = this.gl,
            params = this.wireShader.params,
            view = scene.view;
        glContext.enable(glContext.BLEND);
        glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);
        glContext.depthMask(false);
        this.wireShader.bind();
        var mvpMatrix = Matrix.mul(Matrix.empty(), view.projectionMatrix, view.viewMatrix);
        glContext.uniformMatrix4fv(params.uModelViewProjectionMatrix, false, mvpMatrix);
        glContext.uniform4f(params.uStripParams, 2 / view.size[0], 2 / view.size[1], scene.stripData.strips[3], scene.stripData.strips[4]);
        return true;
    };

    Material.prototype.complete = function () {
        return this.wireShader.complete() &&
               this.shader.complete() &&
               this.stripShader.complete() &&
               (!this.prepassShader || this.prepassShader.complete()) &&
               this.textures.albedo.complete() &&
               this.textures.reflectivity.complete() &&
               this.textures.normal.complete();
    };

    var Matrix = {
        type: Float32Array,
        create: function (a, b, c, d, e, f, g, h, k, l, m, n, r, p, q, u) {
            var s = new Matrix.type(16);
            s[0] = a;
            s[4] = b;
            s[8] = c;
            s[12] = d;
            s[1] = e;
            s[5] = f;
            s[9] = g;
            s[13] = h;
            s[2] = k;
            s[6] = l;
            s[10] = m;
            s[14] = n;
            s[3] = r;
            s[7] = p;
            s[11] = q;
            s[15] = u;
            return s
        },
        empty: function () {
            return new Matrix.type(16)
        },
        identity: function () {
            var a = new Matrix.type(16);
            a[0] = 1;
            a[4] = 0;
            a[8] = 0;
            a[12] = 0;
            a[1] = 0;
            a[5] = 1;
            a[9] = 0;
            a[13] = 0;
            a[2] = 0;
            a[6] = 0;
            a[10] = 1;
            a[14] = 0;
            a[3] = 0;
            a[7] = 0;
            a[11] = 0;
            a[15] = 1;
            return a
        },
        set: function (a, b, c, d, e, f, g, h, k, l, m, n, r, p, q, u, s) {
            a[0] =
                b;
            a[4] = c;
            a[8] = d;
            a[12] = e;
            a[1] = f;
            a[5] = g;
            a[9] = h;
            a[13] = k;
            a[2] = l;
            a[6] = m;
            a[10] = n;
            a[14] = r;
            a[3] = p;
            a[7] = q;
            a[11] = u;
            a[15] = s
        },
        translation: function (a, b, c, d) {
            Matrix.set(a, 1, 0, 0, b, 0, 1, 0, c, 0, 0, 1, d, 0, 0, 0, 1);
            return a;
        },
        rotation: function (a, degree, axis) {
            a[0] = 1;
            a[1] = 0;
            a[2] = 0;
            a[3] = 0;
            a[4] = 0;
            a[5] = 1;
            a[6] = 0;
            a[7] = 0;
            a[8] = 0;
            a[9] = 0;
            a[10] = 1;
            a[11] = 0;
            a[12] = 0;
            a[13] = 0;
            a[14] = 0;
            a[15] = 1;
            var rad = 0.0174532925 * degree;
            var b = Math.sin(rad);
            var d = Math.cos(rad);
            switch (axis) {
                case 0:
                    a[5] = d;
                    a[9] = -b;
                    a[6] = b;
                    a[10] = d;
                    break;
                case 1:
                    a[0] = d;

                    a[8] = b;
                    a[2] = -b;
                    a[10] = d;
                    break;
                case 2:
                    a[0] = d;
                    a[4] = -b;
                    a[1] = b;
                    a[5] = d;
            }
            return a
        },
        mul: function (a, b, c) {
            var d = b[0],
                e = b[1],
                f = b[2],
                g = b[3],
                h = b[4],
                k = b[5],
                l = b[6],
                m = b[7],
                n = b[8],
                r = b[9],
                p = b[10],
                q = b[11],
                u = b[12],
                s = b[13],
                z = b[14];
            b = b[15];
            var t = c[0],
                v = c[1],
                w = c[2],
                x = c[3];
            a[0] = t * d + v * h + w * n + x * u;
            a[1] = t * e + v * k + w * r + x * s;
            a[2] = t * f + v * l + w * p + x * z;
            a[3] = t * g + v * m + w * q + x * b;
            t = c[4];
            v = c[5];
            w = c[6];
            x = c[7];
            a[4] = t * d + v * h + w * n + x * u;
            a[5] = t * e + v * k + w * r + x * s;
            a[6] = t * f + v * l + w * p + x * z;
            a[7] = t * g + v * m + w * q + x * b;
            t = c[8];
            v = c[9];
            w = c[10];
            x = c[11];
            a[8] = t * d + v * h + w * n + x * u;
            a[9] = t * e + v * k + w * r + x * s;
            a[10] = t * f + v * l + w * p + x * z;
            a[11] =
                t * g + v * m + w * q + x * b;
            t = c[12];
            v = c[13];
            w = c[14];
            x = c[15];
            a[12] = t * d + v * h + w * n + x * u;
            a[13] = t * e + v * k + w * r + x * s;
            a[14] = t * f + v * l + w * p + x * z;
            a[15] = t * g + v * m + w * q + x * b;
            return a
        },
        invert: function (a, b) {
            var c = b[0],
                d = b[1],
                e = b[2],
                f = b[3],
                g = b[4],
                h = b[5],
                k = b[6],
                l = b[7],
                m = b[8],
                n = b[9],
                r = b[10],
                p = b[11],
                q = b[12],
                u = b[13],
                s = b[14],
                z = b[15],
                t = c * h - d * g,
                v = c * k - e * g,
                w = c * l - f * g,
                x = d * k - e * h,
                A = d * l - f * h,
                B = e * l - f * k,
                C = m * u - n * q,
                D = m * s - r * q,
                E = m * z - p * q,
                F = n * s - r * u,
                G = n * z - p * u,
                H = r * z - p * s,
                y = t * H - v * G + w * F + x * E - A * D + B * C;
            if (!y) return null;
            y = 1 / y;
            a[0] = (h * H - k * G + l * F) * y;
            a[1] = (e * G - d * H - f * F) * y;
            a[2] = (u * B - s * A + z * x) * y;
            a[3] = (r * A - n * B - p * x) * y;
            a[4] = (k * E - g * H - l * D) * y;
            a[5] = (c * H - e * E + f * D) * y;
            a[6] = (s * w - q * B - z * v) * y;
            a[7] = (m * B - r * w + p * v) * y;
            a[8] = (g * G - h * E + l * C) * y;
            a[9] = (d * E - c * G - f * C) * y;
            a[10] = (q * A - u * w + z * t) * y;
            a[11] = (n * w - m * A - p * t) * y;
            a[12] = (h * D - g * F - k * C) * y;
            a[13] = (c * F - d * D + e * C) * y;
            a[14] = (u * v - q * x - s * t) * y;
            a[15] = (m * x - n * v + r * t) * y;
            return a
        },
        transpose: function (a, b) {
            a[0] = b[0];
            a[4] = b[1];
            a[8] = b[2];
            a[12] = b[3];
            a[1] = b[4];
            a[5] = b[5];
            a[9] = b[6];
            a[13] = b[7];
            a[2] = b[8];
            a[6] = b[9];
            a[10] = b[10];
            a[14] = b[11];
            a[3] = b[12];
            a[7] = b[13];
            a[11] = b[14];
            a[15] = b[15];
            return a
        },
        mul4: function (a, b, c, d, e, f) {
            a[0] = b[0] * c + b[4] * d + b[8] * e + b[12] * f;
            a[1] = b[1] * c + b[5] * d + b[9] * e + b[13] * f;
            a[2] = b[2] * c + b[6] * d + b[10] * e + b[14] * f;
            a[3] = b[3] * c + b[7] * d + b[11] * e + b[15] * f;
            return a
        },
        mulPoint: function (a, b, c, d, e) {
            a[0] = b[0] * c + b[4] * d + b[8] * e + b[12];
            a[1] = b[1] * c + b[5] * d + b[9] * e + b[13];
            a[2] = b[2] * c + b[6] * d + b[10] * e + b[14];
            return a
        },
        mulVec: function (a, b, c, d, e) {
            a[0] = b[0] * c + b[4] * d + b[8] * e;
            a[1] = b[1] * c + b[5] * d + b[9] * e;
            a[2] = b[2] * c + b[6] * d + b[10] * e;
            return a
        },
        perspective: function (a, fov, ratio, near, far, f) {
            f = f || 0;
            fov = 1 / Math.tan(0.00872664625 *
                fov);
            a[0] = fov / ratio;
            a[1] = a[2] = a[3] = 0;
            a[5] = fov;
            a[4] = a[6] = a[7] = 0;
            a[8] = a[9] = 0;
            a[10] = (far + near) / (near - far) - 3.0518044E-5 * f;
            a[11] = -1;
            a[14] = 2 * far * near / (near - far);
            a[12] = a[13] = a[15] = 0;
            return a
        },
        perspectiveInfinite: function (a, fov, aspect, nearPlane, e) {
            e = e || 0;
            fov = 1 / Math.tan(0.00872664625 * fov);
            a[0] = fov / aspect;
            a[1] = a[2] = a[3] = 0;
            a[5] = fov;
            a[4] = a[6] = a[7] = 0;
            a[8] = a[9] = 0;
            a[10] = a[11] = -1 - 3.0518044E-5 * e;
            a[14] = -2 * nearPlane;
            a[12] = a[13] = a[15] = 0;
            return a
        },
        ortho: function (a, left, right, bottom, top, far, near, h) {
            var k = 1 / (right - left),
                l = 1 / (top - bottom),
                m = 1 / (near - far);
            a[0] = k + k;
            a[1] = a[2] = a[3] = 0;
            a[5] = l + l;
            a[4] = a[6] = a[7] = 0;
            a[12] = -(right + left) * k;
            a[13] = -(top + bottom) * l;
            a[10] = -(m + m) - 3.0518044E-5 * (h || 0);
            a[14] = -(near + far) * m;
            a[8] = a[9] = a[11] = 0;
            a[15] = 1;
            return a
        },
        lookAt: function (a, b, c, d) {
            var e = a.subarray(0, 3),
                f = a.subarray(4, 7),
                g = a.subarray(8, 11);
            Vect.sub(g, b, c);
            Vect.cross(e, d, g);
            Vect.normalize(g, g);
            Vect.normalize(e, e);
            Vect.cross(f, g, e);
            Matrix.set(a, e[0], e[1], e[2], -Vect.dot(e, b), f[0], f[1], f[2], -Vect.dot(f, b), g[0], g[1], g[2], -Vect.dot(g, b), 0, 0, 0, 1)
        },
        copy: function (a, b) {
            for (var c = 0; 16 > c; ++c) a[c] = b[c]
        },
        copyToBuffer: function (target, offset, source) {
            for (var i = 0; 16 > i; ++i) {
                target[offset + i] = source[i];
            }
        }
    };

    function Bounds(a) {
        for (var b = 0; b < a.length; ++b) {
            var c = a[b].bounds;
            if (void 0 === this.min) this.min = [c.min[0], c.min[1], c.min[2]], this.max = [c.max[0], c.max[1], c.max[2]];
            else
                for (var d = 0; 3 > d; ++d) this.min[d] = Math.min(c.min[d], this.min[d]), this.max[d] = Math.max(c.max[d], this.max[d])
        }
        this.min = this.min ? this.min : [0, 0, 0];
        this.max = this.max ? this.max : [0, 0, 0];
        this.center = [0.5 * (this.min[0] + this.max[0]), 0.5 * (this.min[1] + this.max[1]), 0.5 * (this.min[2] + this.max[2])];
        this.radius = [this.max[0] - this.center[0], this.max[1] - this.center[1],
            this.max[2] - this.center[2]
        ]
    };

    //decoded
    function Mesh(glContext, desc, meshData) {
        this.gl = glContext;
        this.desc = desc;
        this.name = desc.name;
        this.modelMatrix = Matrix.identity();
        this.origin = desc.transform ? Vect.create(desc.transform[12], desc.transform[13], desc.transform[14], 1) : Vect.create(0, 5, 0, 1);
        this.stride = 32;
        if (this.vertexColor = desc.vertexColor) this.stride += 4;
        if (this.secondaryTexCoord = desc.secondaryTexCoord) this.stride += 8;
        meshData = new ByteStream(meshData.data);
        this.indexCount = desc.indexCount;
        this.indexTypeSize = desc.indexTypeSize;
        this.indexType = 4 == this.indexTypeSize ? glContext.UNSIGNED_INT : glContext.UNSIGNED_SHORT;
        this.indexBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        var data = meshData.readBytes(this.indexCount * this.indexTypeSize);
        glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, data, glContext.STATIC_DRAW);
        this.wireCount = desc.wireCount;
        this.wireBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.wireBuffer);
        data = meshData.readBytes(this.wireCount * this.indexTypeSize);
        glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, data, glContext.STATIC_DRAW);
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);
        this.vertexCount = desc.vertexCount;
        this.vertexBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.vertexBuffer);
        meshData = meshData.readBytes(this.vertexCount * this.stride);
        glContext.bufferData(glContext.ARRAY_BUFFER, meshData, glContext.STATIC_DRAW);
        glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
        if (undefined === desc.minBound || undefined === desc.maxBound) {
            this.bounds ={
                min: Vect.create(-10, -10, -10, 1),
                max: Vect.create(10, 10, -0, 1)
            };
        } else {
            this.bounds = {
                min: Vect.create(desc.minBound[0], desc.minBound[1], desc.minBound[2], 1),
                max: Vect.create(desc.maxBound[0], desc.maxBound[1], desc.maxBound[2], 1)
            };
        }
        this.bounds.maxExtent = Math.max(Math.max(desc.maxBound[0] - desc.minBound[0], desc.maxBound[1] - desc.minBound[1]),
            desc.maxBound[2] - desc.minBound[2])
    };
    //decoded
    function MeshRenderable(mesh, renderable, material) {
        this.mesh = mesh;
        this.gl = this.mesh.gl;
        //子mesh的index偏移值
        this.indexOffset = renderable.firstIndex * mesh.indexTypeSize;
        //子mesh的index大小
        this.indexCount = renderable.indexCount;
        this.wireIndexOffset = renderable.firstWireIndex * mesh.indexTypeSize;
        this.wireIndexCount = renderable.wireIndexCount;
        this.material = material;
    }

    MeshRenderable.prototype.draw = function (scene) {
        var glContext = this.gl;
        if (this.material.bind(scene)) {
            var attribs = this.material.shader.attribs;
            var stride = this.mesh.stride;
            if (this.mesh.desc.cullBackFaces) {
                glContext.enable(glContext.CULL_FACE);
                glContext.cullFace(glContext.BACK);
            } else {
                glContext.disable(glContext.CULL_FACE);
            }
            glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
            glContext.bindBuffer(glContext.ARRAY_BUFFER, this.mesh.vertexBuffer);
            glContext.enableVertexAttribArray(attribs.vPosition);
            glContext.enableVertexAttribArray(attribs.vTexCoord);
            glContext.enableVertexAttribArray(attribs.vTangent);
            glContext.enableVertexAttribArray(attribs.vBitangent);
            glContext.enableVertexAttribArray(attribs.vNormal);
            var bVColor = this.mesh.vertexColor && undefined !== attribs.vColor;
            if (bVColor) {
                glContext.enableVertexAttribArray(attribs.vColor);
            }
            var bUv2 = this.mesh.secondaryTexCoord && undefined !== attribs.vTexCoord2;
            if (bUv2) {
                glContext.enableVertexAttribArray(attribs.vTexCoord2);
            }
            var offset = 0;
            glContext.vertexAttribPointer(attribs.vPosition, 3, glContext.FLOAT, false, stride, offset);
            offset += 12;
            glContext.vertexAttribPointer(attribs.vTexCoord, 2, glContext.FLOAT, false, stride, offset);
            offset += 8;
            if (this.mesh.secondaryTexCoord) {
                if (bUv2) {
                    glContext.vertexAttribPointer(attribs.vTexCoord2, 2, glContext.FLOAT, false, stride, offset);
                }
                offset += 8;
            }
            glContext.vertexAttribPointer(attribs.vTangent, 2, glContext.UNSIGNED_SHORT, true, stride, offset);
            offset += 4;
            glContext.vertexAttribPointer(attribs.vBitangent, 2, glContext.UNSIGNED_SHORT, true, stride, offset);
            offset += 4;
            glContext.vertexAttribPointer(attribs.vNormal, 2, glContext.UNSIGNED_SHORT, true, stride, offset);
            if (bVColor) {
                glContext.vertexAttribPointer(attribs.vColor, 4, glContext.UNSIGNED_BYTE, true, stride, offset + 4);
            }

            glContext.drawElements(glContext.TRIANGLES, this.indexCount, this.mesh.indexType, this.indexOffset);

            glContext.disableVertexAttribArray(attribs.vPosition);
            glContext.disableVertexAttribArray(attribs.vTexCoord);
            glContext.disableVertexAttribArray(attribs.vTangent);
            glContext.disableVertexAttribArray(attribs.vBitangent);
            glContext.disableVertexAttribArray(attribs.vNormal);
            if (bVColor) {
                glContext.disableVertexAttribArray(attribs.vColor);
            }
            if (bUv2) {
                glContext.disableVertexAttribArray(attribs.vTexCoord2);
            }
        }
    };

    //使用shadow的solidshader 
    MeshRenderable.prototype.drawShadow = function (vPos) {
        var glContext = this.gl;
        if (this.mesh.desc.cullBackFaces) {
            glContext.enable(glContext.CULL_FACE);
            glContext.cullFace(glContext.BACK);
        } else {
            glContext.disable(glContext.CULL_FACE);
        }
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.mesh.vertexBuffer);
        glContext.enableVertexAttribArray(vPos);
        glContext.vertexAttribPointer(vPos, 3, glContext.FLOAT, false, this.mesh.stride, 0);
        glContext.drawElements(glContext.TRIANGLES, this.indexCount, this.mesh.indexType, this.indexOffset);
        glContext.disableVertexAttribArray(vPos);
    };

    //使用shadow的alpha shader 
    MeshRenderable.prototype.drawAlphaShadow = function (vPos, vUv) {
        var glContext = this.gl;
        if (this.mesh.desc.cullBackFaces) {
            glContext.enable(glContext.CULL_FACE);
            glContext.cullFace(glContext.BACK);
        } else {
            glContext.disable(glContext.CULL_FACE);
        }
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.mesh.vertexBuffer);
        glContext.enableVertexAttribArray(vPos);
        glContext.enableVertexAttribArray(vUv);
        glContext.vertexAttribPointer(vPos, 3, glContext.FLOAT, false, this.mesh.stride, 0);
        glContext.vertexAttribPointer(vUv, 2, glContext.FLOAT, false, this.mesh.stride, 12);
        glContext.drawElements(glContext.TRIANGLES, this.indexCount, this.mesh.indexType, this.indexOffset);
        glContext.disableVertexAttribArray(vPos);
        glContext.disableVertexAttribArray(vUv);
    };

    MeshRenderable.prototype.drawAlphaPrepass = function (scene) {
        var glContext = this.gl;
        if (this.material.bindAlphaPrepass(scene)) {
            attribs = this.material.prepassShader.attribs;
            var stride = this.mesh.stride;
            if(this.mesh.desc.cullBackFaces){
                glContext.enable(glContext.CULL_FACE);
                glContext.cullFace(glContext.BACK);
            } else {
                glContext.disable(glContext.CULL_FACE);
            }
            glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
            glContext.bindBuffer(glContext.ARRAY_BUFFER, this.mesh.vertexBuffer);
            glContext.enableVertexAttribArray(attribs.vPosition);
            glContext.enableVertexAttribArray(attribs.vTexCoord);
            glContext.vertexAttribPointer(attribs.vPosition, 3, glContext.FLOAT, false, stride, 0);
            glContext.vertexAttribPointer(attribs.vTexCoord, 2, glContext.FLOAT, false, stride, 12);
            glContext.drawElements(glContext.TRIANGLES, this.indexCount, this.mesh.indexType, this.indexOffset);
            glContext.disableVertexAttribArray(attribs.vPosition);
            glContext.disableVertexAttribArray(attribs.vTexCoord);
        }
    };

    MeshRenderable.prototype.drawWire = function () {
        var attribs = this.material.wireShader.attribs,
            glContext = this.gl;
        glContext.enableVertexAttribArray(attribs.vPosition);
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.mesh.wireBuffer);
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.mesh.vertexBuffer);
        glContext.vertexAttribPointer(attribs.vPosition, 3, glContext.FLOAT, false, this.mesh.stride, 0);
        glContext.drawElements(glContext.LINES, this.wireIndexCount, this.mesh.indexType, this.wireIndexOffset);
        glContext.disableVertexAttribArray(attribs.vPosition)
    };

    MeshRenderable.prototype.complete = function () {
        return this.material.complete()
    };

    var Network = {
        fetchImage: function (imageUrl, success, fail) {
            var image = new Image;
            image.crossOrigin = "Anonymous";
            image.onload = function () {
                if(0 < image.width && 0 < image.height) {
                    success(image);
                } else {
                    fail && fail();
                }
            };
            fail && (req.onerror = function () {
                fail();
            });
            image.src = imageUrl;
        },
        fetchText: function (url, success, fail, loading) {
            var request = new XMLHttpRequest;
            request.open("GET", url, true);
            request.onload = function () {
                200 == request.status ? success(request.responseText) : fail && fail()
            };
            fail && (request.onerror = function () {
                fail()
            });
            loading && (request.onprogress = function (progress) {
                loading(progress.loaded, progress.total);
            });
            request.send();
        },
        fetchBinary: function (url, success, fail, loading) {
            var request = new XMLHttpRequest;
            request.open("GET", url, true);
            request.responseType = "arraybuffer";
            request.onload = function () {
                200 == request.status ? success(request.response) : fail && fail()
            };
            fail && (request.onerror = function () {
                fail();
            });
            loading && (request.onprogress = function (progress) {
                loading(progress.loaded, progress.total);
            });
            request.send();
        },
        fetchBinaryIncremental: function (url, success, fail, increment) {
            var request = new XMLHttpRequest;
            request.open("HEAD", url, true);
            request.onload = function () {
                if (200 == request.status) {
                    var f = request.getResponseHeader("Accept-Ranges");
                    if (f && "none" != f) {
                        var g = request.getResponseHeader("Content-Length") | 0,
                            h = function (c, e) {
                                var f = new XMLHttpRequest;
                                f.open("GET", url, true);
                                f.setRequestHeader("Range", "bytes=" + c + "-" + e);
                                f.responseType = "arraybuffer";
                                f.onload = function () {
                                    if((206 == f.status || 200 == f.status) && success(f.response) && e < g ){
                                        c += increment;
                                        e += increment;
                                        if(e < g - 1 ) {
                                            e = e;
                                        } else {
                                            g - 1;
                                            e = h(c, e);
                                        }
                                    }
                                };
                                f.send();
                            };
                        h(0, increment - 1);
                    } else {
                        fail && fail();
                    }
                } else {
                    fail && fail();
                }
            };
            fail && (req.onerror = function () {
                fail();
            });
            request.send();
        }
    };

    function PostRender(a, b, c) {
        this.gl = a;
        this.desc = b;
        b = [];
        if(undefined != this.desc.sharpen ) {
            b.push("#define SHARPEN");
        }
        if (this.useBloom = 0 < this.desc.bloomColor[0] * this.desc.bloomColor[3] ||
            0 < this.desc.bloomColor[1] * this.desc.bloomColor[3] ||
            0 < this.desc.bloomColor[2] * this.desc.bloomColor[3]) {
            b.push("#define BLOOM");
        }
        if(0 != this.desc.vignette[3]) {
            b.push("#define VIGNETTE");
        }
        if (!(1 == this.desc.saturation[0] * this.desc.saturation[3] &&
            1 == this.desc.saturation[1] * this.desc.saturation[3] &&
            1 == this.desc.saturation[2] * this.desc.saturation[3])) {
            b.push("#define SATURATION");
        }
        if(!(1 == this.desc.contrast[0] * this.desc.contrast[3] &&
            1 == this.desc.contrast[1] * this.desc.contrast[3] &&
            1 == this.desc.contrast[2] * this.desc.contrast[3] &&
            1 == this.desc.brightness[0] * this.desc.brightness[3] &&
            1 == this.desc.brightness[1] * this.desc.brightness[3] &&
            1 == this.desc.brightness[2] * this.desc.brightness[3])) {
            b.push("#define CONTRAST");
        }

        if(0 != this.desc.grain){
            b.push("#define GRAIN");
        }
        if(1 == this.desc.toneMap) {
            b.push("#define REINHARD")
        } else if(2 == this.desc.toneMap) {
            b.push("#define HEJL");
        }

        if(this.desc.colorLUT) {
            b.push("#define COLOR_LUT");
        }
        this.sampleCount = 1;
        this.sampleIndex = 0;
        if (c) {
            c = [];
            if(this.gl.hints.mobile) {
                this.sampleCount = 3;
                this.sampleOffsets = [[0.4375, -0.5625],
                                        [0.625, -0.25],
                                        [-0.1875, 0.5]];
            } else {
                c.push("#define HIGHQ");
                this.sampleCount = 4;
                this.sampleOffsets = [ [-0.5, -0.5],
                                        [0.5, -0.5],
                                        [-0.5, 0.5],
                                        [0.5, 0.5] ];
            }
            this.aaResolve = a.shaderCache.fromURLs("postvert.glsl", "aaresolve.glsl", c);
        }
        this.samplesValid = new Uint8Array(4);
        this.shader = a.shaderCache.fromURLs("postvert.glsl", "postfrag.glsl", b);
        this.plainShader = a.shaderCache.fromURLs("postvert.glsl", "postfrag.glsl", []);

        /////////////////////
        //setup test shader
        this.testShader = new Shader(this.gl);
        var vertCode = ShaderTable["postvert.glsl"];
        
        var fragCode = marmoset.texts["cubeShader.frag"];
        this.testShader.build(vertCode, fragCode);
        //shader.bind();
        this.testTexture = new Texture(this.gl);
        this.testTexture.loadImage(marmoset.images["5841762-image.jpg"]);
        ///////////////////
        this.fullscreenTriangle = a.createBuffer();
        a.bindBuffer(a.ARRAY_BUFFER, this.fullscreenTriangle);
        c = new Float32Array([0, 0, 2, 0, 0, 2]);
        a.bufferData(a.ARRAY_BUFFER, c, a.STATIC_DRAW);
        a.bindBuffer(a.ARRAY_BUFFER, null);
        if (this.useBloom) {
            this.bloomTextures = [];
            this.bloomTargets = [];
            for (c = 0; 2 > c; ++c) {
                b = {
                    width: 256,
                    height: 256,
                    clamp: true
                };
                this.bloomTextures[c] = new Texture(a, b);
                this.bloomTextures[c].loadArray(null, a.RGBA, a.ext.textureHalf && a.ext.textureHalfLinear ? a.ext.textureHalf.HALF_FLOAT_OES : a.UNSIGNED_BYTE);
                this.bloomTargets[c] = new Framebuffer(a, {
                    width: b.width,
                    height: b.height,
                    color0: this.bloomTextures[c]
                });
            }
            for (this.bloomSamples = 64; this.bloomSamples + 16 >= a.limits.fragmentUniforms;) {
                this.bloomSamples /= 2;
            }
            this.bloomShader = a.shaderCache.fromURLs("postvert.glsl", "bloom.glsl", ["#define BLOOM_SAMPLES " + this.bloomSamples]);
            this.shrinkShader = a.shaderCache.fromURLs("postvert.glsl", "bloomshrink.glsl")
        }
        a = new Uint8Array(16384);
        for (c = 0; 16384 > c; c++) {
            b = 255 * Math.random();
            var d = 255 * Math.random();
            a[c] = 0.5 * (b + d)
        }
        this.noiseTexture =
            new Texture(this.gl, {
                width: 128,
                height: 128
            });
        this.noiseTexture.loadArray(a, this.gl.LUMINANCE);
        if(this.desc.colorLUT) {
            a = this.desc.colorLUT;
            this.colorLUT = new Texture(this.gl, {
                width: a.length / 3 | 0,
                height: 1,
                clamp: true
            });
            this.colorLUT.loadArray(new Uint8Array(a), this.gl.RGB);
        }
        this.blackTexture = new Texture(this.gl, {
            width: 1,
            height: 1
        });
        this.blackTexture.loadArray(new Uint8Array([0, 0, 0, 0]));
        this.bloomResult = this.blackTexture;
    }

    PostRender.prototype.prepareBloom = function (a) {
        if (this.useBloom && this.bloomShader.complete() && this.shrinkShader.complete()) {
            this.shrinkShader.bind();
            this.bloomTargets[1].bind();
            a.bind(this.shrinkShader.samplers.tInput);
            this.fillScreen(this.shrinkShader.attribs.vCoord);

            this.bloomShader.bind();
            var b = [];
            this.bloomTargets[0].bind();
            this.bloomTextures[1].bind(this.bloomShader.samplers.tInput);
            for (var c = 0, d = 0; d < this.bloomSamples; ++d) {
                var e = -1 + 2 * d / (this.bloomSamples - 1),
                    f;
                f = 4 * e;
                f = Math.exp(-0.5 * f * f / 1) / 2.50662827463;
                c += f;
                b[4 * d + 0] = e * this.desc.bloomSize;
                b[4 * d + 1] = 0;
                b[4 * d + 2] = f;
                b[4 * d + 3] = 0;
            }
            for (d = 0; d < this.bloomSamples; ++d) {
                b[4 * d + 2] /= c;
            }
            this.gl.uniform4fv(this.bloomShader.params.uKernel, b);
            this.fillScreen(this.bloomShader.attribs.vCoord);
            this.bloomTargets[1].bind();
            this.bloomTextures[0].bind(this.bloomShader.samplers.tInput);
            for (d = 0; d < this.bloomSamples; ++d) {
                c = b[4 * d + 0];
                c *= a.desc.width / a.desc.height;
                b[4 * d + 0] = 0;
                b[4 * d + 1] = c;
            }
            this.gl.uniform4fv(this.bloomShader.params.uKernel, b);
            this.fillScreen(this.bloomShader.attribs.vCoord);
            this.bloomResult = this.bloomTextures[1];
        } else {
            this.bloomResult = this.blackTexture;
        }
    };
    PostRender.prototype.computeParams = function (a, b) {
        var c = this.desc,
            d = {};
        d.scale = [c.contrast[0] * c.contrast[3], c.contrast[1] * c.contrast[3], c.contrast[2] * c.contrast[3]];
        d.bias = [c.bias[0] * c.bias[3], c.bias[1] * c.bias[3], c.bias[2] * c.bias[3]];
        d.bias = [-d.bias[0] * d.scale[0] + d.bias[0], -d.bias[1] * d.scale[1] + d.bias[1], -d.bias[2] * d.scale[2] + d.bias[2]];
        var e = [c.brightness[0] * c.brightness[3], c.brightness[1] * c.brightness[3], c.brightness[2] * c.brightness[3]];
        d.scale = [d.scale[0] * e[0], d.scale[1] * e[1], d.scale[2] * e[2]];
        d.bias = [d.bias[0] * e[0], d.bias[1] * e[1], d.bias[2] * e[2]];
        d.saturation = [c.saturation[0] * c.saturation[3], c.saturation[1] * c.saturation[3], c.saturation[2] * c.saturation[3]];
        d.bloomColor = [c.bloomColor[0] * c.bloomColor[3], c.bloomColor[1] * c.bloomColor[3], c.bloomColor[2] * c.bloomColor[3]];
        d.sharpen = [c.sharpen, 0.25 * c.sharpen, c.sharpenLimit];
        d.sharpenKernel = [1 / a, 0, 0, 1 / b];
        e = a > b ? a : b;
        d.vignetteAspect = [a / e, b / e, 0.5 * a / e, 0.5 * b / e];
        d.vignette = [2 * (1 - c.vignette[0]) * c.vignette[3], 2 * (1 - c.vignette[1]) * c.vignette[3], 2 * (1 - c.vignette[2]) *
            c.vignette[3], c.vignetteCurve
        ];
        var e = 1 / this.noiseTexture.desc.width,
            f = 1 / this.noiseTexture.desc.height,
            g = 1 - c.grainSharpness;
        d.grainCoord = [e * a, f * b, 0.5 * g * e, 0.5 * g * f];
        d.grainScaleBias = [2 * c.grain, -c.grain];
        return d
    };
    PostRender.prototype.present = function (a, b, c, d) {
        var mainColor = a;
        if(1 < this.sampleCount) {
            this.allocAABuffers(a.desc.width, a.desc.height);
        }
        if(!d) {

            this.prepareBloom(a);
        }
        var e = d ? this.plainShader : this.shader;
        if (e.bind()) {
            var glContext = this.gl;
            var f = e.samplers,
                g = e.params,
                h = this.computeParams(b, c);
            a.bind(f.tInput);
            this.bloomResult.bind(f.tBloom);
            this.noiseTexture.bind(f.tGrain);
            this.colorLUT && this.colorLUT.bind(f.tLUT);
            glContext.uniform3fv(g.uScale, h.scale);
            glContext.uniform3fv(g.uBias, h.bias);
            glContext.uniform3fv(g.uSaturation, h.saturation);
            glContext.uniform4fv(g.uSharpenKernel, h.sharpenKernel);
            glContext.uniform3fv(g.uSharpness, h.sharpen);
            glContext.uniform3fv(g.uBloomColor, h.bloomColor);
            glContext.uniform4fv(g.uVignetteAspect, h.vignetteAspect);
            glContext.uniform4fv(g.uVignette, h.vignette);
            glContext.uniform4fv(g.uGrainCoord, h.grainCoord);
            glContext.uniform2fv(g.uGrainScaleBias, h.grainScaleBias);

            if (this.aaResolve) {
                //四个sampleBuffer轮流写入
                this.sampleFramebuffers[this.sampleIndex].bind();
                this.fillScreen(e.attribs.vCoord);
                this.samplesValid[this.sampleIndex] = 1;
                Framebuffer.bindNone(glContext);
                glContext.viewport(0, 0, b, c);
                this.aaResolve.bind();
                for (b = a = 0; b < this.sampleCount; ++b) {
                    a += this.samplesValid[b];
                    this.sampleTextures[b].bind(this.aaResolve.samplers["tInput" + b]);
                }

                a = 1 / a;
                glContext.uniform4fv(this.aaResolve.params.uSamplesValid, [this.samplesValid[0] ? a : 0, this.samplesValid[1] ? a : 0, this.samplesValid[2] ? a : 0, this.samplesValid[3] ? a : 0]);

                ////////////////
                //using testshader
                //this.testShader.bind();
                // marmoset.depthTextures[0]
                
                //scene.sky.specularTexture.bind(this.testShader.samplers.mainColor);
                //scene.sky.backgroundTexture.bind(this.testShader.samplers.mainColor);

                //glContext.uniform3fv(this.testShader.params.color, [1.0, 0., 1.0]);
                ///////////////////
                this.fillScreen(this.aaResolve.attribs.vCoord);
                this.sampleIndex = (this.sampleIndex + 1) % this.sampleCount;
            } else {
                Framebuffer.bindNone(glContext);

                glContext.viewport(0, 0, b, c);
                this.fillScreen(e.attribs.vCoord);
            }
        }
    };
    PostRender.prototype.allocAABuffers = function (width, height) {
        if (undefined === this.sampleTextures || this.sampleTextures[0].desc.width != width || this.sampleTextures[0].desc.height != height) {
            this.sampleTextures = [];
            this.sampleFramebuffers = [];
            for (var i = 0; i < this.sampleCount; ++i) {
                var tex = new Texture(this.gl, {
                    width: width,
                    height: height,
                    nofilter: true
                });
                tex.loadArray();
                this.sampleTextures.push(tex);
                this.sampleFramebuffers.push(new Framebuffer(this.gl, {
                    width: width,
                    height: height,
                    color0: tex,
                    ignoreStatus: true
                }));
            }
            this.discardAAHistory();
        }
    };
    PostRender.prototype.adjustProjectionForSupersampling = function (a) {
        if (1 < this.sampleCount) {
            var b = this.sampleOffsets[this.sampleIndex][0] / a.size[0],
                c = this.sampleOffsets[this.sampleIndex][1] / a.size[1],
                b = Matrix.translation(Matrix.empty(), b, c, 0);
            Matrix.mul(a.projectionMatrix, b, a.projectionMatrix)
        }
    };
    PostRender.prototype.discardAAHistory = function () {
        for (var i = this.sampleIndex = 0; i < this.samplesValid.length; ++i) {
            this.samplesValid[i] = 0;
        }
    };
    PostRender.prototype.fillScreen = function (attrib) {
        var glContext = this.gl;
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.fullscreenTriangle);
        glContext.enableVertexAttribArray(attrib);
        glContext.vertexAttribPointer(attrib, 2, glContext.FLOAT, false, 0, 0);
        glContext.drawArrays(glContext.TRIANGLES, 0, 3);
        glContext.disableVertexAttribArray(attrib);
        glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
    };
    //decoded
    function Scene(glContext) {
        this.gl = glContext;
        this.name = "untitled";
        this.meshes = [];
        this.meshRenderables = [];
        this.materials = {};
        this.nextView = this.sky = this.view = null;
        this.viewFade = 0;
        this.shadow = this.stripData = this.lights = null
    }

    Scene.prototype.load = function (archive) {
        var sceneJson;
        var jsonData = archive.extract("scene.json");
        if (undefined !== jsonData) {
          

            jsonData = (new ByteStream(jsonData.data)).asString();

            if (null == jsonData || jsonData.length <= 0) {
                return false;
            }

            try {
                sceneJson = JSON.parse(jsonData)
            } catch (e) {
                console.error(e);
                return false;
            }

        } else {
            return false;
        }

        this.metaData = sceneJson.metaData;
        //视场
        this.view = new View(sceneJson.mainCamera.view);
        //天空球 需要文件
        this.sky = new Sky(this.gl, archive, sceneJson.sky);
        //光
        this.lights = new Lights(sceneJson.lights, this.view);
        //材质 需要文件
        this.materials = {};
        for (var i = 0; i < sceneJson.materials.length; ++i) {
            var material = sceneJson.materials[i];
            material.lightCount = this.lights.count;
            material.shadowCount = this.lights.shadowCount;
            this.materials[material.name] = new Material(this.gl, archive, material);
        }
        //模型 需要文件
        if (sceneJson.meshes) {
            for (var i = 0; i < sceneJson.meshes.length; ++i) {
                var mesh = sceneJson.meshes[i];
                mesh = new Mesh(this.gl, mesh, archive.extract(mesh.file));
                this.meshes.push(mesh);
                for (var j = 0; j < mesh.desc.subMeshes.length; ++j) {
                    var subMesh = mesh.desc.subMeshes[j];
                    this.meshRenderables.push(new MeshRenderable(mesh, subMesh, this.materials[subMesh.material]))
                }
            }
        }

        this.bounds = new Bounds(this.meshes);
        this.postRender = new PostRender(this.gl, sceneJson.mainCamera.post, true);
        this.shadow = new ShadowCollector(this.gl, this.lights.shadowCount);
        this.cameras = sceneJson.Cameras;
        return true;
    };

    Scene.prototype.update = function () {
        this.lights.update(this.view, this.bounds)
    };

    Scene.prototype.collectShadows = function (frameBuffer) {
        this.shadow.collect(this, frameBuffer);
    };

    Scene.prototype.draw = function () {
        var glContext = this.gl;
        //draw sky
        this.sky.setClearColor();
        glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT | glContext.STENCIL_BUFFER_BIT);
        glContext.enable(glContext.DEPTH_TEST);
        this.sky.draw(this);
        //draw not blending
        for (var i = 0; i < this.meshRenderables.length; ++i) {
            if (!this.meshRenderables[i].material.usesBlending) {
                this.meshRenderables[i].draw(this);
            }
        }

        //draw alpha
        glContext.enable(glContext.POLYGON_OFFSET_FILL);
        glContext.polygonOffset(1, 1);
        glContext.colorMask(false, false, false, false);
        for (var i = 0; i < this.meshRenderables.length; ++i) {
            this.meshRenderables[i].drawAlphaPrepass(this);
        }
        //draw blending
        glContext.colorMask(true, true, true, true);
        glContext.disable(glContext.POLYGON_OFFSET_FILL);
        glContext.depthFunc(glContext.LEQUAL);
        glContext.depthMask(false);
        for (var i = 0; i < this.meshRenderables.length; ++i) {
            if (this.meshRenderables[i].material.usesBlending) {
                this.meshRenderables[i].draw(this);
            }
        }
        //draw wire
        glContext.depthMask(true);
        glContext.depthFunc(glContext.LESS);
        if (this.stripData.activeWireframe() &&  this.meshRenderables.length > 0) {
            this.meshRenderables[0].material.bindWire(this);
            for (var i = 0; i < this.meshRenderables.length; ++i) {
                this.meshRenderables[i].drawWire();
            }
            glContext.depthMask(true);
        }

        glContext.disable(glContext.BLEND);
    };

    Scene.prototype.complete = function () {

        if (!this.sky.complete() || !this.shadow.complete()) {
            return false;
        }

        for (var i = 0; i < this.meshRenderables.length; ++i) {
            if (!this.meshRenderables[i].complete()) {
                return false;
            }
        }

        return true;
    };
    //decoded
    function Shader(glContext) {
        this.gl = glContext;
        this.program = null;
        this.params = {};
        this.samplers = {};
        this.attribs = {}
    }
    Shader.prototype.build = function (vertCode, fragCode) {
        var glContext = this.gl;
        this.program = glContext.createProgram();
        this.params = {};
        this.samplers = {};
        this.attribs = {};
        var printCode = function (code) {
            var result = "";
            var endOfLine = code.indexOf("\n");
            var lineNum = 0;
            while (endOfLine != -1) {
                lineNum++;
                result += lineNum + ": ";
                result += code.substring(0, endOfLine + 1);
                code = code.substring(endOfLine + 1, code.length);
                endOfLine = code.indexOf("\n");
            }
            console.log(result)
        };
        // vertex shader
        var shader = glContext.createShader(glContext.VERTEX_SHADER);

        glContext.shaderSource(shader, vertCode);
        glContext.compileShader(shader);
        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
            console.log(glContext.getShaderInfoLog(shader));
            if(marmoset.verboseErrors){
                printCode(vertCode);
            }
        }
        glContext.attachShader(this.program, shader);

        // fragment shader
        shader = glContext.createShader(glContext.FRAGMENT_SHADER);
        glContext.shaderSource(shader, fragCode);
        glContext.compileShader(shader);
        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
            console.log(glContext.getShaderInfoLog(shader));
            if (marmoset.verboseErrors) {
                printCode(fragCode);
            }
        }
        glContext.attachShader(this.program, shader);
        //link
        glContext.linkProgram(this.program);
        if (!glContext.getProgramParameter(this.program, glContext.LINK_STATUS)) {
            console.log(glContext.getProgramInfoLog(this.program));
        }
        //setup uniform
        var uniformNum = glContext.getProgramParameter(this.program, glContext.ACTIVE_UNIFORMS);
        var texUnit = 0;
        for (var i = 0; i < uniformNum; ++i) {
            var uniform = glContext.getActiveUniform(this.program, i);
            var uniformName = uniform.name;

            var bracket = uniformName.indexOf("[");
            if (bracket >= 0) {
                uniformName = uniformName.substring(0, bracket);
            }
            var location = glContext.getUniformLocation(this.program, uniform.name);
            if (uniform.type == glContext.SAMPLER_2D || uniform.type == glContext.SAMPLER_CUBE) {
                this.samplers[uniformName] = {
                    location: location,
                    unit: texUnit++
                };
            } else {
                this.params[uniformName] = location;
            }
        }
        //setup attribute
        var attribNum = glContext.getProgramParameter(this.program, glContext.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < attribNum; ++i) {
            var attribName = glContext.getActiveAttrib(this.program, i).name;
            this.attribs[attribName] = glContext.getAttribLocation(this.program, attribName);
        }
    };
    Shader.prototype.bind = function () {
        if (this.program) {
            this.gl.useProgram(this.program);
            return true;
        } else {
            return false;
        }
    };

    Shader.prototype.complete = function () {
        return !!this.program;
    };
    //decoded
    function ShaderCache(glContext) {
        this.gl = glContext;
        this.cache = []
    }

    ShaderCache.prototype.fromURLs = function (vertCodeName, fragCodeName, prefix,print) {
        var code = "";
        if (prefix !== undefined) {
            for (var i = 0; i < prefix.length; ++i) {
                code = prefix[i] + "\n" + code;
            }
        }
        var cachedName = code + ":" + vertCodeName + "|" + fragCodeName;
        var cachedShader = this.cache[cachedName];
        if (cachedShader !== undefined) {
            return cachedShader;
        } else {
            var shader = new Shader(this.gl);
            var vertCode = null;
            var FragCode = null;
            var callback = function () {
                if (null != vertCode && null != FragCode) {
                    if (undefined !== print) {
                        //console.log("printcode\n" + FragCode);
                    }
                    shader.build(vertCode, FragCode);
                }
            };
            this.fetch(vertCodeName, function (result) {
                vertCode = code + result;
                callback()
            });
            this.fetch(fragCodeName, function (result) {
                FragCode = code + result;
                callback()
            });
            this.cache[cachedName] = shader;
            return shader;
        }
    };

    ShaderCache.prototype.fetch = function (codeName, callback) {
        if("undefined" != typeof ShaderTable ){
            if (undefined !== ShaderTable[codeName]) {
                this.resolveIncludes(new String(ShaderTable[codeName]), callback);
            } else {
                callback("");
            }
        } else {
            Network.fetchText("src/shader/" + codeName, function (result) {
                this.resolveIncludes(result, callback)
            }.bind(this), function () {
                callback("")
            })
        }
    };

    ShaderCache.prototype.resolveIncludes = function (code, callback) {
        var includes = []
        var haveIncludes = true
        var replacement = function (a, tex, e, f, o) {
            haveIncludes = true;
            includes.push({
                offset: o,
                path: tex.slice(1, tex.length - 1)
            });
            return "";
        };
        while (haveIncludes) {
            haveIncludes = false;
            code = code.replace(/#include\s((<[^>]+>)|("[^"]+"))/, replacement);
        }

        if (includes.length > 0) {
            var needToFetch = includes.length;
            for (var i = 0; i < includes.length; ++i) {
                this.fetch(includes[i].path, function (result) {
                    this.src = result;
                    needToFetch = needToFetch - 1;
                    if (needToFetch <= 0) {
                        for (var i = includes.length - 1; i>=0; --i) {
                            code = code.substring(0, includes[i].offset) +
                                   includes[i].src +
                                   code.substring(includes[i].offset);
                        }
                        callback(code)
                    }
                }.bind(includes[i]));
            }
        } else {
            callback(code)
        }
    };

    //shaderSolid
    //shaderAlphaTest
    //depthTargets framebuffer
    //depthTextures 绑定在framebuffer上
    //lights.shadowCounts
    function ShadowCollector(glContext, shadowCounts) {
        this.gl = glContext;
        this.shadowCount = shadowCounts;
        this.desc = depthTexDesc;
        this.shaderSolid = glContext.shaderCache.fromURLs("shadowvert.glsl", "shadowfrag.glsl");
        this.shaderAlphaTest = glContext.shaderCache.fromURLs("shadowvert.glsl", "shadowfrag.glsl", ["#define ALPHA_TEST 1"]);
        this.depthTextures = [];
        this.depthTargets = [];
        if ( this.shadowCount > 0) {
            var depthTexDesc = {
                width: 2048,
                height: 2048,
                clamp: true,
                mipmap: false,
                nofilter: true
            };
            if (glContext.hints.mobile) {
                depthTexDesc.width = depthTexDesc.height = 1536;
            }
            var frameBufferDesc = {
                width: depthTexDesc.width,
                height: depthTexDesc.height,
                depthBuffer: Framebuffer.createDepthBuffer(glContext,
                    depthTexDesc.width, depthTexDesc.height)
            }
            for (var i = 0; i < this.shadowCount; ++i) {
                this.depthTextures[i] = new Texture(glContext, depthTexDesc);
                this.depthTextures[i].loadArray(null, glContext.RGB, glContext.UNSIGNED_BYTE);
                frameBufferDesc.color0 = this.depthTextures[i];
                this.depthTargets[i] = new Framebuffer(glContext, frameBufferDesc);
            }
        }
        marmoset.depthTextures = this.depthTextures;
    }

    //将shadow贴图绑定到指定位置
    ShadowCollector.prototype.bindDepthTexture = function (depthTexLocation, count) {
        if (this.shadowCount > count) {
            this.depthTextures[count].bind(depthTexLocation);
        }
    };

    ShadowCollector.prototype.collect = function (scene, frameBuffer) {

        var glContext = this.gl;

        var lights = scene.lights;
        var modelViewBuffer = lights.modelViewBuffer;
        var projectionBuffer = lights.projectionBuffer;
        var lightMatrix = lights.matrix;
        var shdowCount = lights.shadowCount;
        if (shdowCount <= 0 ) {
            return;
        }
        var lightProjection = Matrix.empty()
        var needUpdate = false;
        for (var i = 0; i < shdowCount; ++i) {
            if (lights.shadowsNeedUpdate[i]) {
                lights.shadowsNeedUpdate[i] = false;
                needUpdate = true;
                Matrix.mul(lightProjection, modelViewBuffer.subarray(16 * i, 16 * (i + 1)), lightMatrix);
                Matrix.mul(lightProjection, projectionBuffer.subarray(16 * i, 16 * (i + 1)), lightProjection);
                //绑定framebuffer
                this.depthTargets[i].bind();
                glContext.clearColor(1, 1, 1, 1);
                glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

                var solideShader = this.shaderSolid;
                solideShader.bind();
                glContext.uniformMatrix4fv(solideShader.params.uViewProjection, false, lightProjection);

                for (var j = 0; j < scene.meshRenderables.length; ++j) {
                    var meshRenderable = scene.meshRenderables[j];
                    var material = meshRenderable.material;
                    if (meshRenderable.mesh.desc.castShadows && material.castShadows) {
                        if (material.shadowAlphaTest <= 0) {
                            meshRenderable.drawShadow(solideShader.attribs.vPosition);
                        }
                    }
                }

                var alphaTestShader = this.shaderAlphaTest;
                alphaTestShader.bind();
                glContext.uniformMatrix4fv(alphaTestShader.params.uViewProjection, false, lightProjection);

                for (var j = 0; j < scene.meshRenderables.length; ++j) {
                    var meshRenderable = scene.meshRenderables[j];
                    material = meshRenderable.material;
                    if (meshRenderable.mesh.desc.castShadows && material.castShadows && material.shadowAlphaTest > 0) {
                        material.textures.albedo.bind(alphaTestShader.samplers.tAlbedo);
                        meshRenderable.drawAlphaShadow(alphaTestShader.attribs.vPosition, alphaTestShader.attribs.vTexCoord);
                    }
                }
            }
        }
        if (needUpdate) {
            frameBuffer.bind();
            glContext.enable(glContext.CULL_FACE);
            glContext.cullFace(glContext.BACK);
        }
    };


    ShadowCollector.prototype.complete = function () {
        return this.shaderSolid.complete() && this.shaderAlphaTest.complete();
    };


    //backgroundShader
    //vertexBuffer
    //indexBuffer
    //skyIndexCount
    //backgroundTexture
    function Sky(glContext, archieve, sky) {
        this.gl = glContext;

        var skyData = archieve.extract("sky.dat") || archieve.extract("sky.png");

        //载入天空贴图
        if (undefined !== skyData) {
            //1*8的贴图
            this.specularTexture = new Texture(glContext, {
                width: 256,
                height: 2048,
                clamp: true
            });

            var data = skyData.data;
            var dataLength = skyData.data.length;
            var stride = dataLength / 4;
            var array = new Uint8Array(dataLength);
            for (var j = 0, i = 0; j < dataLength; ++i) {
                array[j++] = data[i + 2 * stride];
                array[j++] = data[i + stride];
                array[j++] = data[i];
                array[j++] = data[i + 3 * stride];
            }
            this.specularTexture.loadArray(array);
        }

        this.diffuseCoefficients = new Float32Array(sky.diffuseCoefficients);
        this.backgroundMode = sky.backgroundMode || 0;
        this.backgroundBrightness = sky.backgroundBrightness || 1;
        this.backgroundColor = new Float32Array(sky.backgroundColor);

        //天空球 带uv
        var c = 1 / 256, b = 0.5 / 256, d = 2.8 * b, e = 0.5 * b;
        var vertices = new Float32Array([0, 1, 0, 0.49609375 + c, 0.49609375 + c, 1, 0, 0, 0.9921875 + c, 0.49609375 + c, 0, 0, 1, 0.49609375 + c, 0.9921875 + c, -1, 0, 0, 0 + c, 0.49609375 + c, 0, 0, -1, 0.49609375 + c, 0 + c, 0, -1, 0, 0.9921875 +
            c, 0 + c, 0, -1, 0, 0.9921875 + c, 0.9921875 + c, 0, -1, 0, 0 + c, 0.9921875 + c, 0, -1, 0, 0 + c, 0 + c, d, 1 - d, -d, 0.5 + b, 0.5 - b, d, 1 - d, d, 0.5 + b, 0.5 + b, -d, 1 - d, d, 0.5 - b, 0.5 + b, -d, 1 - d, -d, 0.5 - b, 0.5 - b, -d, 0, -1 + d, 0.5 - b, 0 + c + b, d, 0, -1 + d, 0.5 + b, 0 + c + b, 1 - d, 0, -d, 0.9921875 + c - b, 0.5 - b, 1 - d, 0, d, 0.9921875 + c - b, 0.5 + b, d, 0, 1 - d, 0.5 + b, 0.9921875 + c - b, -d, 0, 1 - d, 0.5 - b, 0.9921875 + c - b, -1 + d, 0, d, 0 + c + b, 0.5 + b, -1 + d, 0, -d, 0 + c + b, 0.5 - b, 1, 0, 0, 0.9921875 + c - e, 0.49609375 + c, 0, 0, 1, 0.49609375 + c, 0.9921875 + c - e, -1, 0, 0, 0 + c + e, 0.49609375 + c, 0, 0, -1, 0.49609375 + c, 0 + c + e, 0, 1, 0, 0.49609375 + c - e, 0.49609375 +
            c, 0, 1, 0, 0.49609375 + c, 0.49609375 + c - e, 0, 1, 0, 0.49609375 + c + e, 0.49609375 + c, 0, 1, 0, 0.49609375 + c, 0.49609375 + c + e
        ]);
        var indices = new Uint16Array([2, 1, 6, 3, 2, 7, 8, 4, 3, 4, 5, 1, 9, 14, 15, 17, 10, 16, 18, 19, 11, 20, 13, 12, 28, 12, 13, 13, 24, 28, 28, 24, 9, 9, 24, 14, 25, 9, 15, 25, 15, 21, 10, 25, 21, 10, 21, 16, 22, 26, 10, 22, 10, 17, 18, 11, 26, 22, 18, 26, 19, 23, 27, 19, 27, 11, 23, 20, 27, 27, 20, 12]); 
        if (this.backgroundMode < 1) {
            return;
        }

        //setup sky shader
        this.backgroundShader = glContext.shaderCache.fromURLs("skyvert.glsl", 3 == this.backgroundMode ?
            "skySH.glsl" : "sky.glsl", ["#define SKYMODE " + this.backgroundMode]);
        this.vertexBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.vertexBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);
        glContext.bindBuffer(glContext.ARRAY_BUFFER, null);
        this.indexBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.skyIndexCount = indices.length;
        glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, indices, glContext.STATIC_DRAW);
        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, null);

        //using sh
        if (3 == this.backgroundMode) {
            this.backgroundCoefficients = new Float32Array(this.diffuseCoefficients)
            for (var i = 0; i < this.backgroundCoefficients.length; ++i) {
                this.backgroundCoefficients[i] *= this.backgroundBrightness;
            }
        } else {
            //天空球贴图
            this.backgroundTexture = new Texture(glContext, {
                width: 256,
                height: 256,
                clamp: true
            });
            var valid = false;
            var frameBuffer;
            if(glContext.ext.textureHalf && glContext.ext.textureHalfLinear){
                this.backgroundTexture.loadArray(null, glContext.RGB, glContext.ext.textureHalf.HALF_FLOAT_OES);
                frameBuffer = new Framebuffer(glContext, {
                    color0: this.backgroundTexture
                });
                valid = frameBuffer.valid;
            }
            if (!valid && glContext.ext.textureFloat && glContext.ext.textureFloatLinear && !glContext.hints.mobile) {
                this.backgroundTexture.loadArray(null, glContext.RGB, glContext.FLOAT);
                frameBuffer = new Framebuffer(glContext, {
                    color0: this.backgroundTexture
                });
                valid = frameBuffer.valid;
            }
            if (!valid) {
                this.backgroundTexture.loadArray();
                frameBuffer = new Framebuffer(glContext, {
                    color0: this.backgroundTexture
                });
            }
            frameBuffer.bind();
            //render specularTexture to backgroundTexture
            //天空贴图画到backgroundTexture
            var shader = new Shader(glContext);
            shader.build("precision highp float; varying vec2 uv; attribute vec4 pos; void main(){ gl_Position=pos; uv=vec2(0.5,0.5/8.0)*pos.xy+vec2(0.5,6.5/8.0); }",
                "precision highp float; varying vec2 uv; uniform sampler2D tex; uniform float brightness; void main(){vec4 col=texture2D(tex,uv); gl_FragColor.xyz=col.xyz*(brightness*col.w);}");
            shader.bind();
            //set brightness
            glContext.uniform1f(shader.params.brightness, 7 * Math.sqrt(this.backgroundBrightness));
            this.specularTexture.bind(shader.samplers.tex);
            var buffer = glContext.createBuffer();
            glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
            var data = new Float32Array([-1, -1, 0.5, 1, 3, -1, 0.5, 1, -1, 3, 0.5, 1]);
            glContext.bufferData(glContext.ARRAY_BUFFER, data, glContext.STATIC_DRAW);
            glContext.enableVertexAttribArray(shader.attribs.pos);
            glContext.vertexAttribPointer(shader.attribs.pos, 4, glContext.FLOAT, false, 0, 0);
            glContext.drawArrays(glContext.TRIANGLES, 0, 3);
            glContext.disableVertexAttribArray(shader.attribs.pos)
        }
    }
    Sky.prototype.setClearColor = function () {
        if (marmoset.transparentBackground){
            this.gl.clearColor(0, 0, 0, 0);
        } else if (this.backgroundMode < 1) {
            var a = this.backgroundColor;
            this.gl.clearColor(a[0], a[1], a[2], 1);
        } else {
            this.gl.clearColor(0.0582, 0.06772, 0.07805, 1);
        }
    };
    Sky.prototype.draw = function (scene) {
        if (1 > this.backgroundMode || marmoset.transparentBackground) {
            return false;
        }
        if (this.complete()) {
            var glContext = this.gl;
            //使用sky.frag或者skysh.frag
            var bgShader = this.backgroundShader;
            bgShader.bind();
            //世界矩阵
            glContext.uniformMatrix4fv(bgShader.params.uInverseSkyMatrix, false, scene.lights.invMatrix);
            //view 矩阵
            glContext.uniformMatrix4fv(bgShader.params.uViewProjection, false, scene.view.viewProjectionMatrix);
            //using sh
            if(3 == this.backgroundMode){
                glContext.uniform4fv(bgShader.params.uSkyCoefficients, this.backgroundCoefficients);
            } else {
                this.backgroundTexture.bind(bgShader.samplers.tSkyTexture);
            }
            var alpha = 0.07 + 0.94 * (1 - scene.stripData.activeFade());
            glContext.uniform1f(bgShader.params.uAlpha, alpha);
            //使用天空球的顶点
            glContext.bindBuffer(glContext.ARRAY_BUFFER, this.vertexBuffer);
            glContext.enableVertexAttribArray(bgShader.attribs.vPosition);
            glContext.vertexAttribPointer(bgShader.attribs.vPosition, 3, glContext.FLOAT, false, 20, 0);
            glContext.enableVertexAttribArray(bgShader.attribs.vTexCoord);
            glContext.vertexAttribPointer(bgShader.attribs.vTexCoord, 2, glContext.FLOAT, false, 20, 12);
            glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            if (1 > alpha) {
                glContext.enable(glContext.BLEND);
                glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);
            }
            glContext.depthMask(false);
            glContext.disable(glContext.DEPTH_TEST);
            glContext.drawElements(glContext.TRIANGLES, this.skyIndexCount, glContext.UNSIGNED_SHORT, 0);
            glContext.enable(glContext.DEPTH_TEST);
            glContext.depthMask(true);
            if (1 > alpha) {
                glContext.disable(glContext.BLEND);
            }
            glContext.disableVertexAttribArray(bgShader.attribs.vPosition);
            glContext.disableVertexAttribArray(bgShader.attribs.vTexCoord)
        }
    };
    Sky.prototype.complete = function () {
        if (this.backgroundShader && !this.backgroundShader.complete()) {
            return false;
        } else {
            return this.specularTexture.complete();
        }
    };

    function StripData() {
        this.STRIP_NONE = -2;
        this.STRIP_MENU = -1;
        this.stripCount = 5;
        this.strips = [0, 0, 0, 0, 0];
        this.labels = ["Normals", "Albedo", "Reflectivity", "Gloss", "Topology"];
        this.stripSlant = 0.25;
        this.selectedStrip = this.STRIP_NONE;
        this.animationActive = false;
        this.timestamp = Date.now();
        this.update(!0)
    }

    StripData.expDecay = function (a, b) {
        return Math.exp(-0.69314718 / a * b)
    };

    StripData.prototype.update = function (a) {
        var b = 0.001 * (Date.now() - this.timestamp);
        this.timestamp = Date.now();
        for (var c = !1, d = 0; d < this.stripCount; ++d) {
            var e = 0;
            if(this.selectedStrip == this.STRIP_MENU) {
                e =-0.9 + 0.3 * (d + 1);
            } else if(0 > this.selectedStrip || d < this.selectedStrip) {
                e =-2;
            } else {
                e =2;
            }
            if (a) {
                this.strips[d] = e;
            }  else {
                var f = e - this.strips[d];
                    f = f * StripData.expDecay(0.05, b);
                    if (this.animationActive) {
                        this.strips[d] = e - f;
                    }
                c = c || 1E-4 < Math.abs(f)
            }
        }
        this.animationActive = c;
    };

    StripData.prototype.active = function () {
        return this.selectedStrip >= this.STRIP_MENU
    };

    StripData.prototype.activeFade = function () {
        var a = (this.strips[this.stripCount - 1] - -2) / (-0.9 + 0.3 * this.stripCount - -2),
            a = 1 < a ? 1 : a;
        return 0 > a ? 0 : a
    };

    StripData.prototype.activeWireframe = function () {
        return this.active() && 0.01 < Math.abs(this.strips[4] - this.strips[3])
    };

    StripData.prototype.toggleMenu = function () {
        this.selectedStrip = this.selectedStrip == this.STRIP_MENU ? this.STRIP_NONE : this.STRIP_MENU
    };

    StripData.prototype.selectStrip = function (a, b) {
        if (this.selectedStrip == this.STRIP_MENU) {
            var c = a + b * this.stripSlant;
            this.selectedStrip = this.STRIP_NONE;
            for (var d = 0; d < this.stripCount; ++d) {
                if (c < this.strips[d]) {
                    this.selectedStrip = d;
                    break;
                }
            }
        } else {
            this.selectedStrip = this.STRIP_MENU;
        }
    };
    //decoded
    function Texture(glContext, desc) {
        this.gl = glContext;
        this.type = glContext.TEXTURE_2D;
        this.id = null;
        desc = desc || {};
        this.desc = {
            width: desc.width || 1,
            height: desc.height || 1,
            mipmap: desc.mipmap,
            clamp: desc.clamp,
            mirror: desc.mirror,
            aniso: desc.aniso,
            nofilter: desc.nofilter
        }
    }

    Texture.prototype.loadImage = function (image, type) {
        var glContext = this.gl;
        if (image && image.width && image.height) {
            this.desc.width = image.width;
            this.desc.height = image.height;
        }
        this.id = glContext.createTexture();
        glContext.bindTexture(this.type, this.id);
        glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, !0);
        glContext.texImage2D(this.type, 0, type || glContext.RGBA, type || glContext.RGBA, glContext.UNSIGNED_BYTE, image);
        this.setParams();
        glContext.bindTexture(this.type, null)
    };

    Texture.prototype.loadArray = function (image, type, imageType) {
        var glContext = this.gl;
        this.id = glContext.createTexture();
        glContext.bindTexture(this.type, this.id);
        glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, true);
        glContext.texImage2D(this.type, 0, type || glContext.RGBA, this.desc.width, this.desc.height, 0, type || glContext.RGBA, imageType || glContext.UNSIGNED_BYTE, image || null);
        this.setParams();
        glContext.bindTexture(this.type, null)
    };

    Texture.prototype.setParams = function () {
        var glContext = this.gl;
        var checker = function (a) {
                return 0 < a && 0 == (a & a - 1)
            };
        if (!checker(this.desc.width) && !checker(this.desc.height)) {
            this.desc.clamp = true;
            this.desc.mipmap = false;
        }
        var nofilter = !this.desc.nofilter;
        if(this.desc.mipmap){
            glContext.generateMipmap(this.type);
            glContext.texParameteri(this.type, glContext.TEXTURE_MIN_FILTER, nofilter ? glContext.LINEAR_MIPMAP_LINEAR : glContext.NEAREST_MIPMAP_NEAREST);
        } else {
            glContext.texParameteri(this.type, glContext.TEXTURE_MIN_FILTER, nofilter ? glContext.LINEAR : glContext.NEAREST);
        }
        glContext.texParameteri(this.type, glContext.TEXTURE_MAG_FILTER, nofilter ? glContext.LINEAR : glContext.NEAREST);
        if (this.desc.clamp || this.desc.mirror) {
            var clamp = this.desc.clamp ? glContext.CLAMP_TO_EDGE : glContext.MIRRORED_REPEAT;
            glContext.texParameteri(this.type, glContext.TEXTURE_WRAP_S, clamp);
            glContext.texParameteri(this.type, glContext.TEXTURE_WRAP_T, clamp);
        }
        if (this.desc.aniso && glContext.ext.textureAniso) {
            glContext.texParameteri(this.type, glContext.ext.textureAniso.TEXTURE_MAX_ANISOTROPY_EXT, this.desc.aniso);
        }
    };

    Texture.prototype.rebuildMips = function () {
        this.desc.mipmap && (this.gl.bindTexture(this.type, this.id), this.gl.generateMipmap(this.type))
    };

    Texture.prototype.bind = function (loc) {
        if (loc) {
            var glContext = this.gl;
            glContext.uniform1i(loc.location, loc.unit);
            glContext.activeTexture(glContext.TEXTURE0 + loc.unit);
            glContext.bindTexture(this.type, this.id)
        }
    };

    Texture.prototype.destroy = function () {
        this.gl.deleteTexture(this.id);
        this.id = null
    };

    Texture.prototype.complete = function () {
        return !!this.id
    };

    //decoded
    function TextureCache(glContext) {
        this.gl = glContext;
        this.cache = []
    }

    TextureCache.prototype.fromURL = function (url, desc) {
        var cached = this.cache[url];
        if (undefined !== cached) return cached;
        var tex = new Texture(this.gl, desc);
        Network.fetchImage(url, function (image) {
            tex.loadImage(image)
        });
        return this.cache[url] = tex;
    };

    TextureCache.prototype.fromFile = function (file, desc) {
        if (!file) return null;
        var cached = this.cache[file.name];
        if (undefined !== cached) return cached;
        var tex = new Texture(this.gl, desc);
        this.cache[file.name] = tex;
        TextureCache.parseFile(file, function (image) {
            tex.loadImage(image)
        });
        return tex;
    };

    TextureCache.prototype.fromFilesMergeAlpha = function (a, b, c) {
        if (!b) return this.fromFile(a, c);
        var d = a.name + "|" + b.name,
            e = this.cache[d];
        if (void 0 !== e) return e;
        var f = this.gl;
        this.mergeShader || (this.mergeShader = new Shader(this.gl), this.mergeShader.build("precision highp float; varying vec2 c; attribute vec2 pos; void main(){ gl_Position.xy = 2.0*pos-vec2(1.0); gl_Position.zw = vec2(0.5,1.0); c=pos; }", "precision highp float; varying vec2 c; uniform sampler2D tRGB,tA; void main(){ gl_FragColor.xyz=texture2D(tRGB,c).xyz; gl_FragColor.w=texture2D(tA,c).x; }"),
            this.mergeVerts = f.createBuffer(), f.bindBuffer(f.ARRAY_BUFFER, this.mergeVerts), e = new Float32Array([0, 0, 2, 0, 0, 2]), f.bufferData(f.ARRAY_BUFFER, e, f.STATIC_DRAW), f.bindBuffer(f.ARRAY_BUFFER, null));
        var g = new Texture(this.gl, c);
        this.cache[d] = g;
        var h = 0,
            k = 0,
            l = this.mergeShader,
            m = this.mergeVerts,
            n = function () {
                if (h && k) {
                    var a = h.width > k.width ? h.width : k.width,
                        b = h.height > k.height ? h.height : k.height;
                    g.desc.width = a;
                    g.desc.height = b;
                    if (a <= f.limits.viewportSizes[0] && b <= f.limits.viewportSizes[1]) g.loadArray(null), (new Framebuffer(f, {
                        color0: g,
                        ignoreStatus: !0
                    })).bind(), b = {
                        clamp: !0
                    }, a = new Texture(f, b), a.loadImage(h, f.RGB), b = new Texture(f, b), b.loadImage(k, f.RGB), l.bind(), a.bind(l.samplers.tRGB), b.bind(l.samplers.tA), f.bindBuffer(f.ARRAY_BUFFER, m), f.enableVertexAttribArray(l.attribs.pos), f.vertexAttribPointer(l.attribs.pos, 2, f.FLOAT, !1, 0, 0), f.drawArrays(f.TRIANGLES, 0, 3), f.disableVertexAttribArray(l.attribs.pos), f.bindBuffer(f.ARRAY_BUFFER, null), a.destroy(), b.destroy(), Framebuffer.bindNone(f), g.rebuildMips();
                    else {
                        var c = document.createElement("canvas");
                        c.width = a;
                        c.height = b;
                        var d = c.getContext("2d");
                        d.drawImage(h, 0, 0);
                        c = d.getImageData(0, 0, a, b);
                        c = new Uint8Array(c.data.buffer, c.data.byteOffset, c.data.length);
                        d.drawImage(k, 0, 0);
                        d = d.getImageData(0, 0, a, b).data;
                        a = a * b * 4;
                        for (b = 0; b < a; b += 4) c[b + 3] = d[b];
                        g.loadArray(c)
                    }
                }
            };
        TextureCache.parseFile(a, function (a) {
            h = a;
            n()
        });
        TextureCache.parseFile(b, function (a) {
            k = a;
            n()
        });
        return g
    };

    TextureCache.parseFile = function (file, callBack, image) {
        var tex = image || new Image;
        if ("undefined" != typeof URL && "undefined" != typeof URL.createObjectURL) {
            file = new Blob([file.data], {
                type: file.type
            });
            var url = URL.createObjectURL(file);
            tex.onload = function () {
                URL.revokeObjectURL(url);
                if (callBack) {
                    callBack(tex)
                }
            };
            tex.src = url;
        } else {
            file = new Blob([file.data], {
                type: file.type
            });
            var fileReader = new FileReader;
            fileReader.onload = function (a) {
                tex.src = fileReader.result
            };
            tex.onload = function () {
                if (callBack) {
                    callBack(tex)
                }
            };
            fileReader.readAsDataURL(file)
        }
    };


    function UI(webViewer) {
        this.viewer = webViewer;
        this.stripData = webViewer.stripData;
        var marmosetUI = this.container = document.createElement("div");
        marmosetUI.id = "marmosetUI";
        marmosetUI.style.position = "absolute";
        marmosetUI.style.overflow = "hidden";
        marmosetUI.style["-moz-user-select"] = "none";
        marmosetUI.style["-khtml-user-select"] = "none";
        marmosetUI.style["-webkit-user-select"] = "none";
        marmosetUI.style["-ms-user-select"] = "none";
        this.viewer.domRoot.appendChild(marmosetUI);
    }

    UI.prototype.setSize = function (width, height) {
        this.container.width = width | 0;
        this.container.height = height | 0;
        this.container.style.width = width + "px";
        this.container.style.height = height + "px";
    };

    UI.prototype.clearView = function () {
        for (; this.container.hasChildNodes() ;) {
            this.container.removeChild(this.container.childNodes[0]);
        }
        delete this.progressBar;
        delete this.thumbnail;
        delete this.fadeThumbnail;
        delete this.playButton;
        delete this.helpOverlay;
    };

    UI.prototype.bindInput = function (input) {
        //单击
        input.onSingleTap.push(function (b, c) {
            if(this.stripData.selectedStrip != this.stripData.STRIP_NONE){
                b = 2 / input.element.clientWidth * b - 1;
                c = 1 - 2 / input.element.clientHeight * c;
                this.stripData.selectStrip(b, c);
                if(this.stripData.selectedStrip == this.stripData.STRIP_MENU && this.helpOverlay.active) {
                    this.helpOverlay.toggle();
                }
                this.refreshUI();
                this.viewer.wake();
            }
        }.bind(this));

        //双击
        input.onDoubleTap.push(function (a, c) {
            this.viewer.scene.view.reset();
            this.viewer.wake();
        }.bind(this));
    };

    UI.sanitize = function (a) {
        return a ? a.replace(/<|>|\(|\)|$|%|=/g, "") : a
    };

    UI.sanitizeURL = function (a) {
        return a ? 0 == a.indexOf("http://") || 0 == a.indexOf("https://") || 0 == a.indexOf("ftp://") ? encodeURI(a) : "http://" + encodeURI(a) : a
    };

    UI.prototype.showFailure = function (message) {
        this.container.innerHTML = '<br><br><br><p style="text-align:center;color:#aaaaaa"><b>Marmoset Viewer could not initialize.</b><br><i>' + (message || "") + "</i>"
    };

    UI.prototype.showPreview = function (haveThumbnail) {
        this.clearView();
        this.thumbnail = document.createElement("canvas");
        var ratio = this.container.width / this.container.height;
        this.thumbnail.height = 100;
        this.thumbnail.width = this.thumbnail.height * ratio | 0;
        this.thumbnail.style.width = this.thumbnail.style.height = "100%";

        var canvas = this.thumbnail.getContext("2d");

        var gradient = canvas.fillStyle = canvas.createRadialGradient(this.thumbnail.width / 2, this.thumbnail.height / 2, (this.thumbnail.width + this.thumbnail.height) / 2, this.thumbnail.width / 2, 0, 0);
        gradient.addColorStop(0, "rgb(0,0,0)");
        gradient.addColorStop(1, "rgb(150,150,150)");
        canvas.fillStyle = gradient;
        canvas.fillRect(0, 0, this.thumbnail.width, this.thumbnail.height);
        //按钮
        //this.container.appendChild(this.thumbnail);
        this.playButton = document.createElement("input");
        this.playButton.type = "image";
        //this.playButton.src = marmoset.dataLocale + "play.png";
        this.playButton.style.position = "absolute";
        this.playButton.style.left = "50%";
        this.playButton.style.top = "50%";
        this.playButton.style["-webkit-transform"] = this.playButton.style.transform = "translate(-50%,-50%) scale(0.5,0.5)";
        this.playButton.style.opacity = 0.5;
        this.playButton.style.outline = "0px";
        this.playButton.onclick = function () {
            this.viewer.loadScene(this.viewer.sceneURL);
            this.container.removeChild(this.playButton);
            delete this.playButton;
        }.bind(this);

        this.container.appendChild(this.playButton);
        if (!haveThumbnail) {
            fetchThumbnail(this.viewer.sceneURL, function (result) {
                if(!this.loadingImageURL){
                    this.setThumbnail(result);
                }
            }.bind(this));
        }
    };

    UI.prototype.setThumbnailURL = function (url) {
        if (this.loadingImageURL = url) {
            Network.fetchImage(this.loadingImageURL, this.setThumbnail.bind(this));
        }
    };

    UI.prototype.setThumbnail = function (a) {
        if (this.thumbnail) {
            var canvas = this.thumbnail.getContext("2d"),
                width = this.thumbnail.width,
                height = this.thumbnail.height,
                e = height / a.height;
            canvas.drawImage(a, (width - a.width * e) / 2, 0, a.width * e, height);
            var f;
            try {
                f = canvas.getImageData(0, 0, width, height);
            } catch (g) {
                return;
            }
            a = canvas.createImageData(width, height);
            for (e = 0; 3 > e; ++e) {
                for (var h = f.data, k = a.data, l = 0, m = 0; m < height; ++m) {
                    for (var n = 0; n < width; ++n) {
                        for (var r = 0, p = 0, q = 0, u = -2; 2 >= u; ++u){
                            for (var s = m + u, s = 0 > s ? 0 : s >= height ? height - 1 : s, z = -2; 2 >= z; ++z) {
                                var t = n + z;
                                t = 0 > t ? 0 : t >= width ? width - 1 : t;
                                t = 4 * (s * width + t);
                                r = r + h[t];
                                p = p + h[t + 1];
                                q = q + h[t + 2];
                            }
                        }
                        k[l++] = r / 25;
                        k[l++] = p / 25;
                        k[l++] = q / 25;
                        k[l++] = 255
                    }
                }
                h = f;
                f = a;
                a = h;
            }
            canvas.putImageData(f, 0, 0)
        }
    };

    UI.prototype.showActiveView = function () {
        var thumbnail = this.thumbnail;
        this.clearView();
        if (thumbnail) {
            this.fadeThumbnail = thumbnail;
            this.fadeThumbnail.style.opacity = 1;
            this.container.appendChild(this.fadeThumbnail);
        }
        if (!marmoset.noUserInterface) {
            if(undefined === marmoset.largeUI) {
                marmoset.largeUI = this.viewer.mobile;
            }
            if(450 > this.container.width){
                marmoset.largeUI = false;
            }
            var b = FullScreen.support(),
                b = true;
            var logoSize = 1;
            if (window.devicePixelRatio) {
                if(2 < window.devicePixelRatio){
                    logoSize = 4;
                } else if(1 < window.devicePixelRatio) {
                    logoSize = 2;
                }
            }
            if (marmoset.largeUI && 4 > logoSize) {
                logoSize *= 2;
            }
            var c = marmoset.largeUI ? 0.3 : 0.5;
            this.stripText = [];
            for (var d = 0; d < this.stripData.labels.length; ++d) {
                this.stripText[d] = document.createElement("div");
                this.stripText[d].style.position = "absolute";
                this.stripText[d].style.cursor = "pointer";
                this.stripText[d].style.pointerEvents = "none";
                this.container.appendChild(this.stripText[d]);
                var e = document.createElement("div");
                e.style.color = "white";
                e.style.opacity = 0.5;
                e.style.fontFamily = "Arial";
                e.style.textShadow = "2px 2px 3px #000000";
                e.innerHTML = this.stripData.labels[d];
                this.stripText[d].appendChild(e);
                this.stripText[d].txt = e;
                e = document.createElement("div");
                e.style.width = "10000px";
                e.style.height = "2px";
                e.style.backgroundColor = "#AAAAAA";
                e.style.opacity = 1;
                e.style.position = "absolute";
                e.style.left = e.style.top = "-1px";
                this.stripText[d].appendChild(e);
                this.stripText[d].line = e;
            }
            this.sigCluster = document.createElement("div");
            this.sigCluster.style.position = "absolute";
            this.sigCluster.style.right = marmoset.largeUI ? "12px" : "9px";
            this.sigCluster.style.left = "0px";
            this.sigCluster.style.top = "6px";
            this.sigCluster.style.height = marmoset.largeUI ? "64px" : "32px";
            //猴头
            this.logo = document.createElement("div");
            this.logo.style.position = "absolute";
            this.logo.style.right = marmoset.largeUI ? "-4px" : "1px";
            this.logo.style.top = marmoset.largeUI ? "0px" : "4px";
            this.logo.title = "Made with Marmoset Toolbag";


            var logoButton = document.createElement("input");
            logoButton.type = "image";
            logoButton.src = marmoset.dataLocale + "logo" + logoSize + "x.png";
            logoButton.style.border = "none";
            logoButton.style.width = logoButton.style.height = marmoset.largeUI ? "72px" : "36px";
            logoButton.style.border = "0px";
            logoButton.style.outline = "0px";
            logoButton.style.opacity = c;
            logoButton.onmouseover =  function () {
                this.style.opacity = 1;
            }.bind(logoButton);
            logoButton.onmouseout = function () {
                this.style.opacity = c;
            }.bind(logoButton);
            logoButton.onclick = function (a) {
                window.open("http://www.marmoset.co/viewer?utm_source=inapp&utm_medium=menu&utm_campaign=viewer", "_blank");
                this.style.opacity = c;
            }.bind(logoButton, this);

            var request = new XMLHttpRequest;
            request.open("HEAD", logoButton.src, true);
            request.onload = function (a) {
                this.logo.appendChild(a);
            }.bind(this, logoButton);
            request.send();

            this.sigCluster.appendChild(this.logo);


            var data = this.viewer.scene.metaData;
            data.title = UI.sanitize(data.title);
            data.subtitle = UI.sanitize(data.subtitle);
            data.author = UI.sanitize(data.author);
            data.link = UI.sanitizeURL(data.link);

            var hasTitle = data.title && 0 < data.title.length,
                hasSubtitle = data.subtitle && 0 < data.subtitle.length,
                hasAuthor = data.author && 0 < data.author.length,
                hasLink = data.link && 0 < data.link.length;
            if (hasTitle || hasSubtitle || hasAuthor) {
                if (!hasTitle) {
                    data.title = "Art";
                }

                var notHasTitleAndSub = !hasTitle && !hasSubtitle;
                //竖线
                var line = document.createElement("div");
                line.style.position = "absolute";
                line.style.right = marmoset.largeUI ? "74px" : "46px";
                line.style.top = "5px";
                line.style.width = "1px";
                line.style.height = marmoset.largeUI ? notHasTitleAndSub ? "21px" : "35px" : notHasTitleAndSub ? "18px" : "31px";
                line.style.opacity = 0.25;
                line.style.backgroundColor = "white";
                this.sigCluster.appendChild(line);
                this.sigCluster.line = line;

                //title bar
                var sceneTitle;
                sceneTitle = document.createElement("a");
                if (hasLink) {
                    sceneTitle.href = data.link;
                }
                sceneTitle.style.position = "absolute";
                sceneTitle.style.right = marmoset.largeUI ? "86px" : "58px";
                sceneTitle.style.top = "6px";
                sceneTitle.style.textAlign = "right";
                sceneTitle.style.color = "white";
                sceneTitle.style.fontFamily = "Arial";
                sceneTitle.style.fontSize = marmoset.largeUI ? "14px" : "12px";
                sceneTitle.style.textDecoration = "none";
                sceneTitle.target = "_blank";
                
                var title;
                title = document.createElement("font");
                title.style.color = "#FFFFFF";
                title.style.opacity = 0.5;
                title.style.textDecoration = "none";
                title.style.textShadow = "1px 1px 2px rgba(0,0,0,0.7)";
                title.innerHTML = data.title;
                if (hasAuthor) {
                    if ( hasTitle && !hasSubtitle) {
                        title.innerHTML = title.innerHTML + "<br>by ";
                    } else {
                        title.innerHTML = title.innerHTML + " by ";
                    }
                }
                sceneTitle.appendChild(title);

                var author;
                author = document.createElement("font");
                author.style.color = "#FF0044";
                author.style.opacity = 1;
                author.style.textShadow = "1px 1px 2px rgba(0,0,0,0.35)";
                author.innerHTML = data.author;
                sceneTitle.appendChild(author);

                var subTitle;
                subTitle = document.createElement("font");
                subTitle.style.color = "#FFFFFF";
                subTitle.style.opacity = 0.5;
                subTitle.style.textShadow = "1px 1px 2px rgba(0,0,0,0.7)";
                if (hasSubtitle) {
                    subTitle.innerHTML = "<br>";
                    subTitle.innerHTML += data.subtitle;
                }
                sceneTitle.appendChild(subTitle);

                if (hasLink) {
                    sceneTitle.onmouseover = function (a, b, c) {
                        a.style.opacity = c.style.opacity = 1;
                        b.style.textDecoration = "underline";
                    }.bind(sceneTitle, title, author, subTitle);

                    sceneTitle.onmouseout = function (a, b, c) {
                        a.style.opacity = c.style.opacity = 0.5;
                        b.style.textDecoration = "none";
                    }.bind(sceneTitle, title, author, subTitle);
                }

                this.sigCluster.appendChild(sceneTitle);
                this.sigCluster.sceneTitle = sceneTitle;
            }


           // this.container.appendChild(this.sigCluster);
            this.sigCluster.active = true;
            this.sigCluster.toggle = function () {
                if (this.sceneTitle && this.line) {
                    if(this.active) {
                        this.removeChild(this.sceneTitle);
                        this.removeChild(this.line);
                    } else {
                        this.appendChild(this.sceneTitle);
                        this.appendChild(this.line);
                    }
                }
                this.active = !this.active;
            }.bind(this.sigCluster);
            this.sigCluster.toggle();

            //不显示logo
            //this.sigCluster.removeChild(this.logo);
           
            this.helpOverlay = document.createElement("div");
            this.helpOverlay.style.pointerEvents = "none";
            this.container.appendChild(this.helpOverlay);
            this.hideSigOnHelp = d = 450 > this.container.width;
            this.hideSigOnStrips = true;
            var g = [8, 8];
            var f;
            if (d) {
                e = 198 + 2 * g[0], f = 258 + 2 * g[1];
            } else {
                e = 354 + 2 * g[0], f = 218 + 2 * g[1];
            }

            var helpContent;
            helpContent = document.createElement("div");
            helpContent.style.position = "absolute";
            helpContent.style.width = helpContent.style.height = "100%";
            this.helpOverlay.contents = helpContent;
            helpContent = document.createElement("div");
            helpContent.style.position = "absolute";
            helpContent.style.right = marmoset.largeUI ? "92px" : "54px";
            helpContent.style.top = d ? "16px" : "48px";
            helpContent.style.width = e + "px";
            helpContent.style.height = f + "px";
            this.helpOverlay.contents.appendChild(helpContent);

            //圆角 方块
            var border;
            border = document.createElement("div");
            border.style.position = "absolute";
            border.style.width = "100%";
            border.style.height = "100%";
            border.style.backgroundColor = "black";
            border.style.opacity = "0.65";
            //圆角
            border.style.borderRadius = "16px";
            helpContent.appendChild(border);

            // x close button
            var closeBtn;
            closeBtn = document.createElement("input");
            closeBtn.type = "button";
            closeBtn.value = "x";
            closeBtn.style.position = "absolute";
            closeBtn.style.color = "#FFFFFF";
            closeBtn.style.fontWeight = "bolder";
            closeBtn.style.backgroundColor = "rgba(0,0,0,0.0)";
            closeBtn.style.border = "0px";
            closeBtn.style.outline = "0px";
            closeBtn.style.fontSize = marmoset.largeUI ? "16pt" : "10pt";
            closeBtn.style.right = marmoset.largeUI ? "2px" : "8px";
            closeBtn.style.top = marmoset.largeUI ? "0px" : "4px";
            closeBtn.style.width = closeBtn.style.height = marmoset.largeUI ? "32px" : "16px";
            closeBtn.style.pointerEvents = "auto";
            closeBtn.style.cursor = "pointer";
            closeBtn.onclick = function (a) {
                this.helpOverlay.toggle();
                this.refreshUI();
            }.bind(this, closeBtn);
            helpContent.appendChild(closeBtn);

            var center;
            center = document.createElement("center");
            center.style.position = "absolute";
            center.style.left = g[0] - 4 + "px";
            center.style.right = g[0] + 4 + "px";
            center.style.top = center.style.bottom = g[1] + "px";
            center.style.paddingTop = "8px";
            if (!d) {
                (center.style.paddingRight = "8px");
            }
            helpContent.appendChild(center);


            var suffix = (this.viewer.mobile ? "M" : "PC") + (2 < logoSize ? 4 : 2) + "x.png";

            var helpImg;
            //旋转
            helpImg = document.createElement("img");
            helpImg.src = marmoset.dataLocale + "helprotate" + suffix;
            helpImg.style.width = "66px";
            helpImg.style.height = "90px";
            center.appendChild(helpImg);
            //缩放
            helpImg = document.createElement("img");
            helpImg.src = marmoset.dataLocale + "helpzoom" + suffix;
            helpImg.style.width = "66px";
            helpImg.style.height = "90px";
            center.appendChild(helpImg);

            //移动
            helpImg = document.createElement("img");
            helpImg.src = marmoset.dataLocale + "helpmove" + suffix;
            helpImg.style.width = "66px";
            helpImg.style.height = "90px";
            center.appendChild(helpImg);

            //双击归位
            helpImg = document.createElement("img");
            helpImg.src = marmoset.dataLocale + "helpreset" + suffix;
            helpImg.style.width = "66px";
            helpImg.style.height = "90px";
            center.appendChild(helpImg);

            //shift移动

            helpImg = document.createElement("img");
            helpImg.src = marmoset.dataLocale + "helplights" + suffix;
            helpImg.style.position = "relative";
            if (!d) {
                (helpImg.style.left = "8px");
            }
            helpImg.style.width = "66px";
            helpImg.style.height = "90px";
            center.appendChild(helpImg);

            //large logo button
            var lLogobutton;
            lLogobutton = document.createElement("a");
            lLogobutton.href = "http://www.marmoset.co/viewer?utm_source=inapp&utm_medium=menu&utm_campaign=viewer";
            lLogobutton.target = "_blank";
            lLogobutton.style.pointerEvents = "auto";
            center.appendChild(lLogobutton);

            var shadow;
            shadow = document.createElement("img");
            shadow.src = marmoset.dataLocale + "helpshadow.png";
            shadow.style.position = "absolute";
            shadow.style.left = 0.5 * e - (d ? 65 : 116) + "px";
            shadow.style.bottom = d ? "6px" : "8px";
            shadow.style.width = d ? "116px" : "232px";
            shadow.style.opacity = 0;
            lLogobutton.appendChild(shadow);

            shadow.targetOpacity = 0;
            lLogobutton.onmouseover = function () {
                this.targetOpacity = 0.65;
            }.bind(shadow);
            lLogobutton.onmouseout = function () {
                this.targetOpacity = 0;
            }.bind(shadow);
            window.setInterval(function () {
                this.style.opacity = 0.1 * this.targetOpacity + 0.9 *
                    this.style.opacity;
            }.bind(shadow), 20);

            var lLogo;
            lLogo = document.createElement("img");
            lLogo.src = marmoset.dataLocale + "helptitle.png";
            lLogo.style.position = "absolute";
            lLogo.style.left = 0.5 * e - (d ? 65 : 116) + "px";
            lLogo.style.bottom = d ? "8px" : "12px";
            lLogo.style.width = d ? "116px" : "232px";
            lLogobutton.appendChild(lLogo);

            var space;
            space = document.createElement("div");
            space.style.position = "absolute";
            space.style.left = 0;
            space.style.right = d ? "30px" : "108px";
            space.style.bottom = d ? "-4px" : "4px";
            space.style.textAlign = "right";
            space.style.fontFamilly = "Arial";
            center.appendChild(space);


            d = document.createElement("font");
            d.style.fontSize = "9pt";
            d.style.fontFamily = "Arial";
            space.appendChild(d);

            //网址
            var webAddress;
            webAddress = document.createElement("a");
            webAddress.style.color = "#FF0044";
            webAddress.style.textDecoration = "none";
            webAddress.style.pointerEvents = "auto";
            webAddress.innerHTML = "www.marmoset.co/viewer";
            webAddress.href = "http://www.marmoset.co/viewer?utm_source=inapp&utm_medium=menu&utm_campaign=viewer";
            webAddress.target = "_blank";
            webAddress.onmouseover = function (a) {
                this.style.textDecoration = "underline";
                a.targetOpacity = 0.65;
            }.bind(webAddress, shadow);
            webAddress.onmouseout = function (a) {
                this.style.textDecoration = "none";
                a.targetOpacity = 0;
            }.bind(webAddress, shadow);
            d.appendChild(webAddress);


            this.helpOverlay.active = false;
            this.helpOverlay.toggle = function (a) {
                if(this.active) {
                    this.removeChild(this.contents);
                } else {
                    this.appendChild(this.contents);
                }
                this.active = !this.active;
            }.bind(this.helpOverlay, this.viewer);

            //菜单 最大化 帮助 等
            this.menuCluster = document.createElement("div");
            this.menuCluster.style.position = "absolute";
            this.menuCluster.style.right = marmoset.largeUI ? "4px" : "8px";
            this.menuCluster.style.top = marmoset.largeUI ? "70px" : "40px";
            if(marmoset.largeUI ) {
                this.menuCluster.style.width = "72px";
                this.menuCluster.style.height = "64px";
            } else {
                this.menuCluster.style.width = "36px";
                this.menuCluster.style.height = "36px";
            }
            var menuContents = document.createElement("div");
            menuContents.style.left = menuContents.style.top = "0px";
            menuContents.style.width = menuContents.style.height = "100%";
            this.menuCluster.contents = menuContents;
            this.menuCluster.appendChild(menuContents);


            var createButton = function (content, title, imageName, counter, opacity) {
                var button = document.createElement("input");
                button.type = "image";
                button.src = marmoset.dataLocale + imageName;
                button.style.position = "absolute";
                button.style.left = "0px";
                button.style.bottom = -100 * counter + "%";
                button.style.border = "none";
                button.style.outline = "0px";
                button.title = title;
                button.style.opacity = opacity;
                if(marmoset.largeUI){
                    button.style.width = "64px";
                    button.style.height = "48px";
                } else {
                    button.style.width = "32px";
                    button.style.height = "24px";
                }

                button.onmouseover = function (opacity) {
                    this.style.opacity = opacity;
                }.bind(button, 1);

                button.onmouseout = function (opacity) {
                    this.style.opacity = opacity;
                }.bind(button, opacity);

                button.onmouseup = function (opacity) {
                    this.style.opacity = opacity;
                }.bind(button, opacity);

                var request = new XMLHttpRequest;
                request.open("HEAD", button.src, true);
                request.onload = function (content) {
                    content.appendChild(this);
                }.bind(button, content);
                request.send();
                return button;
            };
            var buttonCounter = 0;
            var button;
            //全屏幕 按钮
            button = createButton(this.menuCluster.contents, "Full Screen", "fullscreen" + logoSize + "x.png", buttonCounter++, c);
            button.onclick = function (button) {
                if(FullScreen.active()){
                    FullScreen.end();
                } else {
                    FullScreen.begin(this.viewer.domRoot,this.viewer.fullscreenChange.bind(this.viewer));
                }
                button.style.opacity = c;
                this.refreshUI();
            }.bind(this, button);

            //全屏幕 分层
            button = createButton(this.menuCluster.contents, "Layer Views", "strips" + logoSize + "x.png", buttonCounter++, c);

            button.onclick = function (button) {
                this.stripData.toggleMenu();
                if(this.helpOverlay.active){
                    this.helpOverlay.toggle();
                }
                this.viewer.wake();
                this.refreshUI()
            }.bind(this, button);

            //全屏幕 帮助

            button = createButton(this.menuCluster.contents, "Help", "help" + logoSize + "x.png", buttonCounter++, c);

            button.onclick = function (button) {
                if(this.stripData.selectedStrip == this.stripData.STRIP_MENU) {
                    this.stripData.toggleMenu();
                }
                this.helpOverlay.toggle();
                this.refreshUI();
            }.bind(this, button);

            //菜单
            //this.container.appendChild(this.menuCluster);
            this.menuCluster.active = true;

            this.menuCluster.toggle = function () {
                if(this.active){
                    this.removeChild(this.contents);
                } else {
                    this.appendChild(this.contents);
                }
                this.active = !this.active;
            }.bind(this.menuCluster);
            //this.menuCluster.toggle();
            if(undefined !== marmoset.hostImage){
                if(marmoset.hostURL){
                    var hostLogo = document.createElement("a");
                    hostLogo.href = marmoset.hostURL;
                    hostLogo.target = "_blank";
                }
                var img;
                img = document.createElement("img");
                img.src = marmoset.hostImage;
                img.style.position = "absolute";
                img.style.top = "4px";
                img.style.left = "4px";
                img.style.opacity = 0.65;
                img.style["-webkit-transform"] = img.style.transform = "translate(-50%,-50%) scale(0.5,0.5) translate(50%,50%)";
                if(marmoset.hostURL){
                    img.onmouseover = function () {
                        this.style.opacity = 1
                    }.bind(img);
                    img.onmouseout = function () {
                        this.style.opacity = 0.5
                    }.bind(img);
                    hostLogo.appendChild(img);
                    this.hostLogo = hostLogo;
                } else {
                    this.hostLogo = img;
                    var request = new XMLHttpRequest;
                    request.open("HEAD", img.src, true);
                    request.onload = function () {
                        this.container.appendChild(this.hostLogo)
                    }.bind(this);
                    request.send();
                }
            }

            this.sceneStats = document.createElement("text");
            this.sceneStats.style.position = "absolute";
            this.sceneStats.style.left = "9px";
            this.sceneStats.style.bottom = "8px";
            this.sceneStats.style.color = "gray";
            this.sceneStats.style.fontFamily = "Arial";
            this.sceneStats.style.fontSize = "75%";
            var a;
            for (d = b = a = 0; d < this.viewer.scene.meshes.length; ++d) {
                e = this.viewer.scene.meshes[d];
                a += e.indexCount / 3;
                b += e.vertexCount;
            }
            this.sceneStats.innerHTML = "Triangles: " + (a | 0).toLocaleString() + "<br>Vertices: " + (b | 0).toLocaleString();
            if(marmoset.showFrameTime){
                this.frameTimer = document.createElement("text");
                this.frameTimer.style.position = "absolute";
                this.frameTimer.style.left = this.frameTimer.style.top = "5px";
                this.frameTimer.style.color = "gray";
                this.frameTimer.style.fontSize = "75%";
                this.container.appendChild(this.frameTimer);
                this.frameTimer.innerHTML = "--";
                this.frameCount = 1E20;

            }
            this.animateStrips()
        }
    };

    UI.prototype.refreshUI = function () {
        if (this.sigCluster) {
            var a = false,
                b = this.stripData.selectedStrip == this.stripData.STRIP_MENU;
            if (this.hideSigOnStrips) {
                a = a || b;
            }
            if (this.hideSigOnHelp) {
                a = a || this.helpOverlay.active
            }
            if (this.sigCluster.active == a) {
                this.sigCluster.toggle();
            }
        }
    };

    UI.prototype.signalLoadProgress = function (a, b) {
        if (this.thumbnail) {
            if (!this.progressBar) {
                var c = document.createElement("div");
                c.style.backgroundColor = "rgb(30,30,30)";
                c.style.opacity = 0.5;
                c.style.position = "absolute";
                c.style.left = "20%";
                c.style.width = "60%";
                c.style.bottom = "30%";
                c.style.height = "2px";
                this.progressBar = document.createElement("div");
                this.progressBar.style.backgroundColor = "white";
                this.progressBar.style.position = "absolute";
                this.progressBar.style.left = this.progressBar.style.bottom = "0px";
                this.progressBar.style.height = "100%";
                this.progressBar.style.width = "0px";
                c.appendChild(this.progressBar);
                this.container.appendChild(c);
                this.playButton && (this.container.removeChild(this.playButton), delete this.playButton)
            }
            if(0 >= b) {
                this.progressBar.style.width = (100 * a / (2097152 + a) | 0) + "%";
            } else {
                this.progressBar.style.width = (100 * a / b | 0) + "%";
            }
        }
    };

    UI.prototype.animating = function () {
        return !!this.fadeThumbnail || !!this.frameTimer
    };

    UI.prototype.animate = function () {
        if(this.fadeThumbnail) {
            this.fadeThumbnailTimer = this.fadeThumbnailTimer || Date.now();
            this.fadeThumbnail.style.opacity = 1 - 0.0015 * (Date.now() - this.fadeThumbnailTimer);
            if(0.01 > this.fadeThumbnail.style.opacity) {
                this.container.removeChild(this.fadeThumbnail);
                delete this.fadeThumbnail;
                delete this.fadeThumbnailTimer;
            }
        }
        if (this.frameTimer && (this.frameCount++, 60 <= this.frameCount)) {
            var a = (new Date).getTime();
            if (void 0 !== this.frameTime) {
                var b = (a - this.frameTime) / this.frameCount,
                    b = Math.floor(100 * b) / 100;
                this.frameTimer.innerHTML = b + " ms";
                this.frameTimer.style.color = 32 > b ? "green" : "red"
            }
            this.frameCount = 0;
            this.frameTime = a
        }
        if(this.sceneStats) {
            a = !!this.sceneStats.parentElement;
            b = this.stripData.active();
            if(a && !b){
                this.container.removeChild(this.sceneStats);
                if(this.hostLogo) {
                    this.container.appendChild(this.hostLogo);
                }
            } else if( !a && b) {
                this.container.appendChild(this.sceneStats);
                if (this.hostLogo) {
                    this.container.appendChild(this.hostLogo);
                }
            }
        }
        this.refreshUI();
        if(this.stripData.animationActive || this.stripData.active()){
            this.animateStrips();
        }
    };


    UI.prototype.animateStrips = function () {
        if (this.stripText) {
            var a = Math.atan(this.viewer.canvas.height / this.viewer.canvas.width / this.stripData.stripSlant);
            for (var b = 0; b < this.stripData.labels.length; ++b) {
                var c = this.stripData.strips[b];
                c = c - this.stripData.stripSlant;
                c = 0.5 + 0.5 * c;
                if(b == this.stripData.selectedStrip) {
                    this.stripText[b].style["-ms-transform"] = this.stripText[b].style["-webkit-transform"] = this.stripText[b].style.transform = "none";
                    this.stripText[b].style.top = "4px";
                    this.stripText[b].style.left = "0px";
                    this.stripText[b].style.width = "150px";
                    this.stripText[b].txt.style.textAlign = "center";
                    this.stripText[b].txt.style.background = "rgba(0, 0, 0, 0.75)";
                    this.stripText[b].txt.style.background = "-webkit-linear-gradient(left, rgba(0,0,0,0.75), rgba(0,0,0,0))";
                    this.stripText[b].txt.style.background = "-o-linear-gradient(left, rgba(0,0,0,0.75), rgba(0,0,0,0))";
                    this.stripText[b].txt.style.background = "-moz-linear-gradient(left, rgba(0,0,0,0.75), rgba(0,0,0,0))";
                    this.stripText[b].txt.style.background = "linear-gradient(left, rgba(0,0,0,0.75), rgba(0,0,0,0))";
                    this.stripText[b].txt.style.paddingLeft = "32px";
                    this.stripText[b].txt.style.paddingTop = "6px";
                    this.stripText[b].txt.style.paddingBottom = "4px";
                    this.stripText[b].txt.style.textShadow = "1px 1px 2px rgba(0,0,0,0.7)";
                    this.stripText[b].line.style.opacity = 0.5;
                    this.stripText[b].line.style.top = "100%";
                    this.stripText[b].line.style.width = "100%";
                    this.stripText[b].line.style.height = "1px";
                } else {
                    this.stripText[b].style["-ms-transform"] = this.stripText[b].style["-webkit-transform"] = 
                        this.stripText[b].style.transform = "translate(-50%, -50%) rotate(" + a + "rad) translate(50%, 50%)";
                    this.stripText[b].style.left = 100 * c + "%";
                    this.stripText[b].style.top = "0px";
                    this.stripText[b].style.width = "85px";
                    this.stripText[b].txt.style.textAlign = "left";
                    this.stripText[b].txt.style.background = "none";
                    this.stripText[b].txt.style.paddingLeft = "8px";
                    this.stripText[b].txt.style.paddingTop = "6px";
                    this.stripText[b].txt.style.paddingBottom = "4px";
                    this.stripText[b].txt.style.textShadow = "2px 0px 3px rgba(0,0,0,0.7)";
                    this.stripText[b].line.style.opacity = 1;
                    this.stripText[b].line.style.top = "-1px";
                }
                this.stripText[b].line.style.width = "10000px";
                this.stripText[b].line.style.height = "2px";
            }
        }
    };

    //decoded
    var Vect = {
        type: Float32Array,
        create: function (a, b, c, d) {
            var e = new Vect.type(4);
            e[0] = a;
            e[1] = b;
            e[2] = c;
            e[3] = d;
            return e
        },
        empty: function () {
            return new Vect.type(4)
        },
        set: function (a, b, c, d, e) {
            a[0] = b;
            a[1] = c;
            a[2] = d;
            a[3] = e
        },
        copy: function (a, b) {
            a[0] = b[0];
            a[1] = b[1];
            a[2] = b[2];
            a[3] = b[3]
        },
        add: function (a, b, c) {
            a[0] = b[0] + c[0];
            a[1] = b[1] + c[1];
            a[2] = b[2] + c[2];
            a[3] = b[3] + c[3];
            return a
        },
        sub: function (a, b, c) {
            a[0] = b[0] - c[0];
            a[1] = b[1] - c[1];
            a[2] = b[2] - c[2];
            a[3] = b[3] - c[3];
            return a
        },
        scale: function (a, b, c) {
            a[0] = c[0] * b;
            a[1] = c[1] * b;
            a[2] = c[2] *
                b;
            a[3] = c[3] * b;
            return a
        },
        mul: function (a, b, c) {
            a[0] = b[0] * c[0];
            a[1] = b[1] * c[1];
            a[2] = b[2] * c[2];
            a[3] = b[3] * c[3];
            return a
        },
        mad: function (a, b, c, d) {
            a[0] = b[0] * c[0] + d[0];
            a[1] = b[1] * c[1] + d[1];
            a[2] = b[2] * c[2] + d[2];
            a[3] = b[3] * c[3] + d[3];
            return a
        },
        smad: function (a, b, c, d) {
            a[0] = b * c[0] + d[0];
            a[1] = b * c[1] + d[1];
            a[2] = b * c[2] + d[2];
            a[3] = b * c[3] + d[3];
            return a
        },
        negate: function (a, b) {
            a[0] = -b[0];
            a[1] = -b[1];
            a[2] = -b[2];
            return a
        },
        negate4: function (a, b) {
            a[0] = -b[0];
            a[1] = -b[1];
            a[2] = -b[2];
            a[3] = -b[3];
            return a
        },
        length: function (a) {
            var b = a[0],
                c = a[1];
            a = a[2];
            return Math.sqrt(b * b + c * c + a * a)
        },
        dot: function (a, b) {
            return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
        },
        dot4: function (a, b) {
            return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
        },
        normalize: function (a, b) {
            var c = b[0],
                d = b[1],
                e = b[2],
                f = Math.sqrt(c * c + d * d + e * e);
            if (0 == f) return Vect.set(a, 0, 0, 0, 0);
            f = 1 / f;
            a[0] = c * f;
            a[1] = d * f;
            a[2] = e * f;
            return a
        },
        cross: function (a, b, c) {
            a[0] = b[1] * c[2];
            a[0] += -b[2] * c[1];
            a[1] = b[2] * c[0] - b[0] * c[2];
            a[2] = b[0] * c[1] - b[1] * c[0];
            return a
        },
        lerp: function (a, b, c, d) {
            var e = 1 - d;
            a[0] = b[0] * e + c[0] * d;
            a[1] = b[1] * e + c[1] * d;
            a[2] =
                b[2] * e + c[2] * d;
            return a
        },
        lerp4: function (a, b, c, d) {
            var e = 1 - d;
            a[0] = b[0] * e + c[0] * d;
            a[1] = b[1] * e + c[1] * d;
            a[2] = b[2] * e + c[2] * d;
            a[3] = b[3] * e + c[3] * d;
            return a
        },
        min: function (a, b, c) {
            a[0] = Math.min(b[0], c[0]);
            a[1] = Math.min(b[1], c[1]);
            a[2] = Math.min(b[2], c[2]);
            a[3] = Math.min(b[3], c[3]);
            return a
        },
        max: function (a, b, c) {
            a[0] = Math.max(b[0], c[0]);
            a[1] = Math.max(b[1], c[1]);
            a[2] = Math.max(b[2], c[2]);
            a[3] = Math.max(b[3], c[3]);
            return a
        },
        projectOnPlane: function (a, b, c, d) {
            var e = Vect.empty();
            Vect.sub(e, b, c);
            c = Vect.dot(e, d);
            smad(a, -c, normal,
                b);
            return a
        }
    };

    //decoded
    function View(view) {
        this.pivot = [0, 0, 0];
        this.rotation = [0, 0];
        this.radius = 1;
        this.nearPlane = 0.3;
        this.fov = 45;
        this.size = [1, 1];
        this.transform = Matrix.empty();
        this.viewMatrix = Matrix.empty();
        this.projectionMatrix = Matrix.empty();
        this.viewProjectionMatrix = Matrix.empty();
        this.projectionOffset = [0, 0];
        if (view) {
            this.loadView(view, true);
        } else {
            this.saveResetView();
            this.updateView();
            this.updateProjection();
        }
    }

    View.prototype.saveResetView = function () {
        this.resetDesc = {
            angles: [this.rotation[0], this.rotation[1]],
            pivot: [this.pivot[0], this.pivot[1], this.pivot[2]],
            limits: this.limits,
            orbitRadius: this.radius,
            fov: this.fov
        }
    };

    View.prototype.loadView = function (view, saveReset) {
        if (view) {
            this.rotation[0] = view.angles[0];
            this.rotation[1] = view.angles[1];
            this.pivot[0] = view.pivot[0];
            this.pivot[1] = view.pivot[1];
            this.pivot[2] = view.pivot[2];
            this.radius = view.orbitRadius;
            this.fov = view.fov;
            this.limits = view.limits;
            if (saveReset) {
                this.saveResetView();
            }
            this.updateView();
            this.updateProjection();
        }
    };

    View.prototype.reset = function () {
        this.loadView(this.resetDesc)
    };

    View.prototype.updateView = function () {
        if (undefined !== this.limits) {
            if (this.limits.angles) {
                var a = this.limits.angles.x,
                    b = this.limits.angles.y;
                if (undefined !== a) {
                    var c = this.rotation[0] - a.offset,
                        a = Math.min(Math.max(c, a.min), a.max);
                    this.rotation[0] += a - c
                }
                if (undefined !== b) {
                    c = this.rotation[1] - b.offset;
                    a = Math.min(Math.max(c, b.min), b.max);
                    this.rotation[1] += a - c;
                }
            }
            if (undefined !== this.limits.orbitRadius) {
                var minRadius = this.limits.orbitRadius.min;
                var maxRadius = this.limits.orbitRadius.max;
                if (undefined !== minRadius) {
                    this.radius = Math.max(this.radius, minRadius);
                    if (undefined !== maxRadius) {
                        this.radius = Math.min(this.radius, maxRadius)
                    }
                }
            }
            if(undefined !== this.limits.pan) {
                var pan = this.limits.pan;
                var pivot = this.resetDesc.pivot;
                if (pan.x) {
                    this.pivot[0] = pivot[0];
                    if (pan.y) {
                        this.pivot[1] = pivot[1];
                        if (pan.z) {
                            this.pivot[2] = pivot[2];
                        }
                    }
                }
            }
        }
        Matrix.translation(this.transform, 0, 0, this.radius);
        b = Matrix.rotation(Matrix.empty(), this.rotation[0], 0);
        c = Matrix.rotation(Matrix.empty(), this.rotation[1], 1);
        Matrix.mul(b, c, b);
        Matrix.mul(this.transform, b, this.transform);
        this.transform[12] += this.pivot[0];
        this.transform[13] += this.pivot[1];
        this.transform[14] += this.pivot[2];
        Matrix.invert(this.viewMatrix, this.transform);
        Matrix.mul(this.viewProjectionMatrix, this.viewMatrix, this.projectionMatrix)
    };

    View.prototype.offsetProjection = function (x, y) {
        this.projectionOffset[0] = -2 * x;
        this.projectionOffset[1] = -2 * y;
    };

    View.prototype.updateProjection = function (a) {
        Matrix.perspectiveInfinite(this.projectionMatrix, this.fov, this.size[0] / this.size[1], this.nearPlane, a);
        this.projectionMatrix[8] = this.projectionOffset[0];
        this.projectionMatrix[9] = this.projectionOffset[1];
        Matrix.mul(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix)
    };

    //decoded
    function WebViewer(width, height, sceneURL, haveThumbnail) {
        //this.mobile = /Android|iPhone|iPod|iPad|Windows Phone|IEMobile|BlackBerry|webOS/.test(navigator.userAgent);
        this.mobile = false;
        this.domRoot = document.createElement("div");
        this.domRoot.style.width = width + "px";
        this.domRoot.style.height = height + "px";
        this.initCanvas(width, height);
        this.scene = this.input = null;
        this.sceneURL = sceneURL;
        this.sleepCounter = 8;
        this.onLoad = null;
        this.stripData = new StripData;
        this.ui = new UI(this);
        this.ui.setSize(width, height);
        this.ui.showPreview(haveThumbnail)
    }


    WebViewer.prototype.initCanvas = function (width, height) {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = document.createElement("canvas");
        this.canvas.width = 1 * width;
        this.canvas.height = 1 * height;
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";
        this.canvas.style.position = "absolute";
        this.domRoot.appendChild(this.canvas);
    };

    WebViewer.prototype.initGL = function () {
        var config = {
            alpha: !!marmoset.transparentBackground,
            //支持depth !!
            depth: false,
            stencil: false,
            antialias: false,
            premultipliedAlpha: !!marmoset.transparentBackground,
            preserveDrawingBuffer: false
        };
        var glContext = this.gl = this.canvas.getContext("webgl", config) || this.canvas.getContext("experimental-webgl", config);

        if (!this.gl) {
            this.ui.showFailure('Please <a href="http://get.webgl.org/" target=_blank>check<a/> to ensure your browser has support for WebGL.');
            return false;
        }
        this.canvas.addEventListener("webglcontextlost", function (a) {
            a.preventDefault();
        }.bind(this), false);
        this.canvas.addEventListener("webglcontextrestored", function (a) {
            this.loadScene(this.sceneURL);
        }.bind(this), false);
        glContext.ext = {
            textureAniso: glContext.getExtension("EXT_texture_filter_anisotropic") || glContext.getExtension("WEBKIT_EXT_texture_filter_anisotropic") || glContext.getExtension("MOZ_EXT_texture_filter_anisotropic"),
            textureFloat: glContext.getExtension("OES_texture_float"),
            textureFloatLinear: glContext.getExtension("OES_texture_float_linear"),
            textureHalf: glContext.getExtension("OES_texture_half_float"),
            textureHalfLinear: glContext.getExtension("OES_texture_half_float_linear"),
            textureDepth: glContext.getExtension("WEBGL_depth_texture"),
            colorBufferFloat: glContext.getExtension("WEBGL_color_buffer_float"),
            colorBufferHalf: glContext.getExtension("EXT_color_buffer_half_float"),
            index32bit: glContext.getExtension("OES_element_index_uint"),
            loseContext: glContext.getExtension("WEBGL_lose_context"),
            derivatives: glContext.getExtension("OES_standard_derivatives")
        };
        glContext.limits = {
            textureSize: glContext.getParameter(glContext.MAX_TEXTURE_SIZE),
            varyings: glContext.getParameter(glContext.MAX_VARYING_VECTORS),
            vertexAttribs: glContext.getParameter(glContext.MAX_VERTEX_ATTRIBS),
            vertexUniforms: glContext.getParameter(glContext.MAX_VERTEX_UNIFORM_VECTORS),
            fragmentUniforms: glContext.getParameter(glContext.MAX_FRAGMENT_UNIFORM_VECTORS),
            viewportSizes: glContext.getParameter(glContext.MAX_VIEWPORT_DIMS),
            vendor: glContext.getParameter(glContext.VENDOR),
            version: glContext.getParameter(glContext.VERSION)
        };
        glContext.hints = {
            mobile: this.mobile
        };
        glContext.enable(glContext.DEPTH_TEST);
        glContext.shaderCache = new ShaderCache(glContext);
        glContext.textureCache = new TextureCache(glContext);
        this.allocBacking();
        return true;
    };

    WebViewer.prototype.allocBacking = function () {
        var glContext = this.gl,
            valid = false,
            desc = {
                width: this.canvas.width,
                height: this.canvas.height
            };
        this.mainColor = new Texture(glContext, desc);
        if (glContext.ext.textureHalf && glContext.ext.textureHalfLinear) {
            this.mainColor.loadArray(null, glContext.RGBA, glContext.ext.textureHalf.HALF_FLOAT_OES);
            this.mainBuffer = new Framebuffer(glContext, {
                color0: this.mainColor,
                createDepth: true
            });
            valid = this.mainBuffer.valid;
        }
        if (!valid && glContext.ext.textureFloat && glContext.ext.textureFloatLinear && !glContext.hints.mobile) {
            this.mainColor.loadArray(null, glContext.RGBA, glContext.FLOAT);
            this.mainBuffer = new Framebuffer(glContext, {
                color0: this.mainColor,
                createDepth: true
            });
            valid = this.mainBuffer.valid;
        }
        while(!valid) {
            this.mainColor = new Texture(glContext, desc);
            this.mainColor.loadArray(null, glContext.RGBA, glContext.UNSIGNED_BYTE);
            this.mainBuffer = new Framebuffer(glContext, {
                color0: this.mainColor,
                createDepth: true
            });
            valid = this.mainBuffer.valid;
            desc.width /= 2;
            desc.height /= 2;
        }
    };

    WebViewer.prototype.loadScene = function (sceneUrl) {
        this.sceneURL = sceneUrl || this.sceneURL;
        this.scene = this.input = null;
        if (this.initGL() && this.sceneURL) {

            var loading = this.ui.signalLoadProgress.bind(this.ui);

            var successCallBack = function (a) {
                loading(1, 1);
                this.scene = new Scene(this.gl);
                this.scene.stripData = this.stripData;
                if (this.scene.load(new Archive(a))) {
                    if (2070 >= this.scene.metaData.tbVersion) {
                        this.ui.showFailure("This .mview file is from an out-of-date beta version of Toolbag. Please re-export it with the new version. Thanks!");
                    } else {
                        this.bindInput();
                        this.requestFrame(this.updateLoad.bind(this));
                        if (this.onLoad) {
                            this.onLoad();
                        }
                    }
                } else {
                    this.ui.showFailure("Package file could not be read or is invalid.");
                }
            }.bind(this);

            var failCallBack = function () {
                this.ui.showFailure("Package file (" + this.sceneURL + ") could not be retrieved.");
            }.bind(this);

            Network.fetchBinary(this.sceneURL, successCallBack, failCallBack, loading);
        }
    };

    WebViewer.prototype.unload = function () {
        delete this.scene;
        delete this.input;
        delete this.ui;
        delete this.mainColor;
        delete this.mainBuffer;
        delete this.gl;
        var width = this.domRoot.clientWidth,
            height = this.domRoot.clientHeight;
        this.initCanvas(width, height);
        this.ui = new UI(this);
        this.ui.setSize(width, height);
        this.ui.showPreview();
        this.cancelFrame();
    };

    WebViewer.prototype.bindInput = function () {
        this.input = new Input(this.ui.container);
        var a = function () {
            this.wake();
            this.scene.postRender.discardAAHistory()
        }.bind(this);

        this.input.onDrag.push(function (b, c, d, e) {
            b = 1 - 2.2 / (Math.sqrt(d * d + e * e) + 2.2);
            c = this.scene.view;
            c.rotation[1] -= 0.4 * d * b;
            c.rotation[0] -= 0.4 * e * b;
            c.rotation[0] = 90 < c.rotation[0] ? 90 : c.rotation[0];
            c.rotation[0] = -90 > c.rotation[0] ? -90 : c.rotation[0];
            c.updateView();
            a();
        }.bind(this));

        this.input.onPan.push(function (b, c) {
            var d = this.scene.view,
                e = d.fov / 45 * 0.8 *
                (d.radius / this.domRoot.clientHeight),
                f = -b * e,
                e = c * e;
            d.pivot[0] += f * d.transform[0] + e * d.transform[4];
            d.pivot[1] += f * d.transform[1] + e * d.transform[5];
            d.pivot[2] += f * d.transform[2] + e * d.transform[6];
            d.updateView();
            a();
        }.bind(this));

        this.input.onPan2.push(function (b, c) {
            var d = 1 - 2.2 / (Math.sqrt(b * b + c * c) + 2.2);
            this.scene.lights.rotation -= 0.4 * b * d;
            a()
        }.bind(this));

        this.input.onZoom.push(function (b) {
            var c = this.scene.view;
            c.radius *= 1 - 0.002 * b;
            c.radius = 0.001 > c.radius ? 0.001 : c.radius;
            c.radius = 1E3 < c.radius ? 1E3 : c.radius;
            c.updateView();
            a();
        }.bind(this));
        this.ui.bindInput(this.input)
    };

    WebViewer.prototype.wake = function (a) {
        this.sleepCounter = a || 16;
        this.requestFrame(this.update.bind(this))
    };

    WebViewer.prototype.requestFrame = function (callBack) {
        var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        if (!this.frameRequestPending) {
            var reCall = function () {
                this.frameRequestPending = 0;
                callBack();
            }.bind(this);
            this.frameRequestPending = requestAnimationFrame(reCall, this.canvas)
        }
    };

    WebViewer.prototype.cancelFrame = function () {
        if(this.frameRequestPending ){
            if(window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame){
                this.frameRequestPending;
            }
        }
    };

    WebViewer.prototype.fullscreenChange = function () {
        if(FullScreen.active()) {
            this.oldRootWidth = this.domRoot.style.width;
            this.oldRootHeight = this.domRoot.style.height;
            this.domRoot.style.width = "100%";
            this.domRoot.style.height = "100%";
        } else {
            this.domRoot.style.width = this.oldRootWidth;
            this.domRoot.style.height = this.oldRootHeight;
        }
        this.wake();
    };

    WebViewer.prototype.resize = function (width, height) {
        if (width && height)
        {
            this.domRoot.style.width = width + "px";
            this.domRoot.style.height = height + "px";
        } else {
            width = this.domRoot.clientWidth;
            height = this.domRoot.clientHeight;
        }
        this.canvas.width = 1 * width;
        this.canvas.height = 1 * height;
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";
        this.ui.setSize(width, height);
        this.allocBacking();
        this.wake();
    };
    
    //loading 更新进度条
    WebViewer.prototype.updateLoad = function () {
        if(this.scene.complete()){
            this.start();
        } else {
            this.requestFrame(this.updateLoad.bind(this));
        }
        this.ui.animate();
    };

    WebViewer.prototype.start = function () {
        this.scene.view.updateView();
        this.ui.showActiveView();
        this.drawScene();
        this.requestFrame(this.update.bind(this))
    };

    WebViewer.prototype.update = function () {
        if (0 < this.sleepCounter || this.ui.animating() || this.stripData.animationActive) {
            this.stripData.update();
            this.ui.animate();
            this.scene.update();
            this.drawScene();
            this.requestFrame(this.update.bind(this));
        }
        this.sleepCounter--;
    };

    WebViewer.prototype.drawScene = function () {
        if (!this.gl.isContextLost()) {
            if (!(this.domRoot.clientWidth == this.canvas.clientWidth && this.domRoot.clientHeight == this.canvas.clientHeight)) {
                this.resize();
            }
                this.scene.view.size = [this.mainBuffer.width, this.mainBuffer.height];
                this.scene.view.updateProjection();
                // supersampling平移
                this.scene.postRender.adjustProjectionForSupersampling(this.scene.view);
                this.scene.collectShadows(this.mainBuffer);
                this.mainBuffer.bind();
                //Framebuffer.bindNone(this.gl);
                this.scene.draw();
                this.scene.postRender.present(this.mainColor, this.canvas.width, this.canvas.height, this.stripData.active());
        }
    };

    marmoset = "undefined" == typeof marmoset ? {} : marmoset;
    marmoset.WebViewer = WebViewer;
    marmoset.dataLocale = (0 == window.location.protocol.indexOf("https") ? "https:" : "http:") + "//viewer.marmoset.co/main/data/";
    var ShaderTable = {
        //decocde     
        "aaresolve.glsl": "precision mediump float;uniform sampler2D tInput0;uniform sampler2D tInput1;uniform sampler2D tInput2;\n#ifdef HIGHQ\nuniform sampler2D tInput3;\n#endif\nuniform vec4 uSamplesValid;varying highp vec2 vUv;void main(void){vec4 input0=texture2D(tInput0,vUv);vec4 input1=texture2D(tInput1,vUv);vec4 input2=texture2D(tInput2,vUv);\n#ifdef HIGHQ\nvec4 input3=texture2D(tInput3,vUv);gl_FragColor=input0*uSamplesValid.x+input1*uSamplesValid.y+input2*uSamplesValid.z+input3*uSamplesValid.w;\n#else\ngl_FragColor=input0*uSamplesValid.x+input1*uSamplesValid.y+input2*uSamplesValid.z;\n#endif\n}",
        //decocde     
        "alphaprepassfrag.glsl": "precision mediump float;\n#include <matdither.glsl>\nuniform sampler2D tAlbedo;varying mediump vec2 vUv;void main(){float albedo=texture2D(tAlbedo,vUv).a;if(albedo<=dither(vUv.x)){discard;}gl_FragColor=vec4(0.0);}",
        //decocde     
        "alphaprepassvert.glsl": "precision highp float;uniform mat4 uModelViewProjectionMatrix;attribute vec3 vPosition;attribute vec2 vTexCoord;varying mediump vec2 vUv;vec4 mul(mat4 m,vec3 v){return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];}void main(void){gl_Position=mul(uModelViewProjectionMatrix,vPosition.xyz);vUv=vTexCoord;}",
        //decocde     
        "bloom.glsl": "precision mediump float;uniform sampler2D tInput;uniform vec4 uKernel[BLOOM_SAMPLES];varying highp vec2 vUv;void main(void){vec3 col=vec3(0.0,0.0,0.0);for(int i=0;i<BLOOM_SAMPLES;++i){vec3 kernel=uKernel[i].xyz;col+=texture2D(tInput,vUv+kernel.xy).xyz*kernel.z;}gl_FragColor.xyz=col;gl_FragColor.w=0.0;}",
        //decocde     
        "bloomshrink.glsl": "precision highp float;uniform sampler2D tInput;varying highp vec2 vUv;void main(void){float epsilon=0.25/256.0;gl_FragColor=0.25*(texture2D(tInput,vUv+vec2(epsilon,epsilon))+texture2D(tInput,vUv+vec2(epsilon,-epsilon))+texture2D(tInput,vUv+vec2(-epsilon,epsilon))+texture2D(tInput,vUv+vec2(-epsilon,-epsilon)));}",
        //decocde     
        "matdither.glsl": "float dither(highp float offset){highp float x=0.5*fract(gl_FragCoord.x*0.5)+0.5*fract(gl_FragCoord.y*0.5);return 0.4+0.6*fract(x+3.141592e6*offset);}float l(highp float B){highp float C=0.5*fract(gl_FragCoord.x*0.5)+0.5*fract(gl_FragCoord.y*0.5);return 0.4+0.6*fract(C+3.141592e6*B);}",

        "matfrag.glsl": "\n#extension GL_OES_standard_derivatives : enable\n"+
        "precision mediump float;" +
        "varying highp vec3 D;" +
        "varying mediump vec2 j;" +
        "varying mediump vec3 E;" +
        "varying mediump vec3 F;" +
        "varying mediump vec3 G;" +
        "\n#ifdef VERTEX_COLOR\n" +
        "varying lowp vec4 H;" +
        "\n#endif" +
        "\n#ifdef TEXCOORD_SECONDARY\n" +
        "varying mediump vec2 I;" +
        "\n#endif\n" +
        "uniform sampler2D tAlbedo;" +
        "uniform sampler2D tReflectivity;" +
        "uniform sampler2D tNormal;" +
        "uniform sampler2D tExtras;" +
        "uniform sampler2D tSkySpecular;" +
        "uniform vec4 uDiffuseCoefficients[9];" +
        "uniform vec3 uCameraPosition;" +
        "uniform vec3 uFresnel;" +
        "uniform float uAlphaTest;" +
        "uniform float uHorizonOcclude;" +
        "uniform float uHorizonSmoothing;" +
        "\n#ifdef EMISSIVE\n" +
        "uniform float uEmissiveScale;" +
        "uniform vec4 uTexRangeEmissive;" +
        "\n#endif" +
        "\n#ifdef AMBIENT_OCCLUSION\n" +
        "uniform vec4 uTexRangeAO;" +
        "\n#endif" +
        "\n#ifdef LIGHT_COUNT\n" +
        "uniform vec4 uLightPositions[LIGHT_COUNT];" +
        "uniform vec3 uLightDirections[LIGHT_COUNT];" +
        "uniform vec3 uLightColors[LIGHT_COUNT];" +
        "uniform vec3 uLightParams[LIGHT_COUNT];" +
        "uniform vec3 uLightSpot[LIGHT_COUNT];" +
        "\n#endif" +
        "\n#ifdef ANISO\n" +
        "uniform float uAnisoStrength;" +
        "uniform vec3 uAnisoTangent;" +
        "uniform float uAnisoIntegral;" +
        "uniform vec4 uTexRangeAniso;" +
        "\n#endif" +
        "\n#define saturate(x) clamp( x, 0.0, 1.0 )" +
        "\n#include <matsampling.glsl>" +
        "\n#include <matlighting.glsl>" +
        "\n#include <matshadows.glsl>" +
        "\n#include <matskin.glsl>" +
        "\n#include <matmicrofiber.glsl>" +
        "\n#include <matstrips.glsl>" +
        "\n#ifdef TRANSPARENCY_DITHER" +
        "\n#include <matdither.glsl>" +
        "\n#endif\n" +
        "void main(void){" +
        "vec4 J=texture2D(tAlbedo,j);" +
        "vec3 K=L(J.xyz);" +
        "float k=J.w;" +
        "\n#ifdef VERTEX_COLOR\n" +
        "{" +
        "vec3 M=H.xyz;" +
        "\n#ifdef VERTEX_COLOR_SRGB\n" +
        "M=M*(M*(M*0.305306011+vec3(0.682171111))+vec3(0.012522878));" +
        "\n#endif\n" +
        "K*=M;" +
        "\n#ifdef VERTEX_COLOR_ALPHA\n" +
        "k*=H.w;\n" +
        "#endif\n" +
        "}" +
        "\n#endif" +
        "\n#ifdef ALPHA_TEST\n" +
        "if(k<uAlphaTest){discard;}" +
        "\n#endif" +
        "\n#ifdef TRANSPARENCY_DITHER\n" +
        "k=(k>l(j.x))?1.0:k;" +
        "\n#endif\n" +
        "vec3 N=O(texture2D(tNormal,j).xyz);" +
        "\n#ifdef ANISO" +
        "\n#ifdef ANISO_NO_DIR_TEX\n" +
        "vec3 P=Q(uAnisoTangent);" +
        "\n#else\n" +
        "J=R(j,uTexRangeAniso);" +
        "vec3 P=2.0*J.xyz-vec3(1.0);" +
        "P=Q(P);" +
        "\n#endif\n" +
        "P=P-N*dot(P,N);" +
        "P=normalize(P);" +
        "vec3 S=P*uAnisoStrength;" +
        "\n#endif\n" +
        "vec3 T=normalize(uCameraPosition-D);" +
        "J=texture2D(tReflectivity,j);" +
        "vec3 U=L(J.xyz);" +
        "float V=J.w;" +
        "float W=V;" +
        "\n#ifdef HORIZON_SMOOTHING\n" +
        "float X=dot(T,N);" +
        "X=uHorizonSmoothing-X*uHorizonSmoothing;" +
        "V=mix(V,1.0,X*X);" +
        "\n#endif" +
        "\n#ifdef STRIPVIEW\n" +
        "Y Z;dc(Z,V,U);" +
        "\n#endif\n" +
        "float dd=1.0;" +
        "\n#ifdef AMBIENT_OCCLUSION" +
        "\n#ifdef AMBIENT_OCCLUSION_SECONDARY_UV\n" +
        "dd=R(I,uTexRangeAO).x;" +
        "\n#else\n" +
        "dd=R(j,uTexRangeAO).x;" +
        "\n#endif\n" +
        "dd*=dd;" +
        "\n#endif" +
        "\n#if defined(SKIN)\n" +
        "de df;" +
        "dh(df);" +
        "df.di*=dd;" +
        "\n#elif defined(MICROFIBER)\n" +
        "dj dk;dl(dk,N);" +
        "dk.dm*=dd;" +
        "\n#else\n" +
        "vec3 dn=du(N);" +
        "dn*=dd;" +
        "\n#endif\n" +
        "vec3 dv=reflect(-T,N);" +
        "\n#ifdef ANISO\n" +
        "vec3 rt=dv-(0.5*S*dot(dv,P));" +
        "vec3 dA=dB(rt,mix(V,0.5*V,uAnisoStrength));" +
        "\n#else\n" +
        "vec3 dA=dB(dv,V);" +
        "\n#endif\n" +
        "dA*=dC(dv,G);" +
        "\n#ifdef LIGHT_COUNT\n" +
        "highp float dD=10.0/log2(V*0.968+0.03);" +
        "dD*=dD;" +
        "float dE=dD*(1.0/(8.0*3.1415926))+(4.0/(8.0*3.1415926));" +
        "dE=min(dE,1.0e3);" +
        "\n#ifdef SHADOW_COUNT\n" +
        "dF dG;" +
        "\n#ifdef SKIN" +
        "\n#ifdef SKIN_VERSION_1\n" +
        "dH(dG,SHADOW_KERNEL+SHADOW_KERNEL*df.dI);" +
        "\n#else\n" +
        "dJ dK;" +
        "float dL=SHADOW_KERNEL+SHADOW_KERNEL*df.dI;dM(dK,dL);" +
        "dH(dG,dL);" +
        "\n#endif" +
        "\n#else\n" +
        "dH(dG,SHADOW_KERNEL);" +
        "\n#endif" +
        "\n#endif" +
        "\n#ifdef ANISO\n" +
        "dE*=uAnisoIntegral;" +
        "\n#endif\n" +
        "for(int u=0;u<LIGHT_COUNT;++u){" +
        "vec3 dN=uLightPositions[u].xyz-D*uLightPositions[u].w;" +
        "float dO=inversesqrt(dot(dN,dN));" +
        "dN*=dO;" +
        "float a=saturate(uLightParams[u].z/dO);" +
        "a=1.0+a*(uLightParams[u].x+uLightParams[u].y*a);" +
        "float s=saturate(dot(dN,uLightDirections[u]));" +
        "s=saturate(uLightSpot[u].y-uLightSpot[u].z*(1.0-s*s));" +
        "vec3 dP=(a*s)*uLightColors[u].xyz;" +
        "\n#if defined(SKIN)" +
        "\n#ifdef SHADOW_COUNT" +
        "\n#ifdef SKIN_VERSION_1\n" +
        "dQ(df,dG.dR[u],1.0,dN,N,dP);" +
        "\n#else\n" +
        "dQ(df,dG.dR[u],dK.dK[u],dN,N,dP);" +
        "\n#endif" +
        "\n#else\n" +
        "dQ(df,1.0,0.0,dN,N,dP);" +
        "\n#endif" +
        "\n#elif defined(MICROFIBER)" +
        "\n#ifdef SHADOW_COUNT\n" +
        "dS(dk,dG.dR[u],dN,N,dP);" +
        "\n#else\n" +
        "dS(dk,1.0,dN,N,dP);" +
        "\n#endif" +
        "\n#else\n" +
        "float dT=saturate((1.0/3.1415926)*dot(dN,N));" +
        "\n#ifdef SHADOW_COUNT\n" +
        "dT*=dG.dR[u];" +
        "\n#endif\n" +
        "dn+=dT*dP;" +
        "\n#endif\n" +
        "vec3 dU=dN+T;" +
        "\n#ifdef ANISO\n" +
        "dU=dU-(S*dot(dU,P));" +
        "\n#endif\n" +
        "dU=normalize(dU);" +
        "float dV=dE*pow(saturate(dot(dU,N)),dD);" +
        "\n#ifdef SHADOW_COUNT\n" +
        "dV*=dG.dR[u];" +
        "\n#endif\n" +
        "dA+=dV*dP;" +
        "}" +
        "\n#endif" +
        "\n#if defined(SKIN)\n" +
        "vec3 dn," +
        "diff_extra;" +
        "dW(dn,diff_extra,df,T,N,V);" +
        "\n#elif defined(MICROFIBER)\n" +
        "vec3 dn," +
        "diff_extra;" +
        "dX(dn,diff_extra,dk,T,N,V);" +
        "\n#endif\n" +
        "dA*=dY(T,N,U,V*V);" +
        "\n#ifdef DIFFUSE_UNLIT\n" +
        "gl_FragColor.xyz=K+dA;" +
        "\n#else\n" +
        "gl_FragColor.xyz=dn*K+dA;" +
        "\n#endif" +
        "\n#if defined(SKIN) || defined(MICROFIBER)\n" +
        "gl_FragColor.xyz+=diff_extra;" +
        "\n#endif" +
        "\n#ifdef EMISSIVE" +
        "\n#ifdef EMISSIVE_SECONDARY_UV\n" +
        "vec2 dZ=I;" +
        "\n#else\n" +
        "vec2 dZ=j;" +
        "\n#endif\n" +
        "gl_FragColor.xyz+=uEmissiveScale*L(R(dZ,uTexRangeEmissive).xyz);" +
        "\n#endif\n#ifdef STRIPVIEW\n" +
        "gl_FragColor.xyz=ec(Z,N,K,U,W,dn,dA,gl_FragColor.xyz);" +
        "\n#endif" +
        "\n#ifdef NOBLEND\n" +
        "gl_FragColor.w=1.0;" +
        "\n#else\n" +
        "gl_FragColor.w=k;" +
        "\n#endif\n" +
        "}",

        "matlighting.glsl": "vec3 ed(vec3 ee,float ef){return exp(-0.5*ef/(ee*ee))/(ee*2.5066283);}vec3 eh(vec3 ee){return vec3(1.0,1.0,1.0)/(ee*2.5066283);}vec3 ei(vec3 ej){return vec3(-0.5,-0.5,-0.5)/(ej);}vec3 ek(vec3 el,float ef){return exp(el*ef);}\n#define SAMPLE_COUNT 21.0\n#define SAMPLE_HALF 10.0\n#define GAUSS_SPREAD 0.05\nvec3 em(float en,float eo,vec3 eu){vec3 ev=vec3(eo,eo,eo);ev=0.8*ev+vec3(0.2);vec3 eA=cos(ev*3.14159);vec3 eB=cos(ev*3.14159*0.5);eB*=eB;eB*=eB;eB*=eB;ev=ev+0.05*eA*eB*eu;eB*=eB;eB*=eB;eB*=eB;ev=ev+0.1*eA*eB*eu;ev=saturate(ev);ev*=ev*1.2;return ev;}vec3 eC(vec3 eu){return vec3(1.0,1.0,1.0)/3.1415926;}float eD(float en,float eu){return saturate(-en*eu+en+eu);}vec3 eE(float en,vec3 eu){return saturate(-en*eu+vec3(en)+eu);}float eF(float eu){return-0.31830988618379*eu+0.31830988618379;}vec3 eG(vec3 eu){return-0.31830988618379*eu+vec3(0.31830988618379);}vec3 dY(vec3 T,vec3 N,vec3 U,float eH){float eI=1.0-saturate(dot(T,N));float eJ=eI*eI;eI*=eJ*eJ;eI*=eH;return(U-eI*U)+eI*uFresnel;}vec2 eK(vec2 eL,vec2 eu){eL=1.0-eL;vec2 eM=eL*eL;eM*=eM;eL=mix(eM,eL*0.4,eu);return eL;}vec3 du(vec3 eN){\n#define c(n) uDiffuseCoefficients[n].xyz\nvec3 C=(c(0)+eN.y*((c(1)+c(4)*eN.x)+c(5)*eN.z))+eN.x*(c(3)+c(7)*eN.z)+c(2)*eN.z;\n#undef c\nvec3 sqr=eN*eN;C+=uDiffuseCoefficients[6].xyz*(3.0*sqr.z-1.0);C+=uDiffuseCoefficients[8].xyz*(sqr.x-sqr.y);return C;}void eO(inout vec3 eP,inout vec3 eQ,inout vec3 eR,vec3 eN){eP=uDiffuseCoefficients[0].xyz;eQ=uDiffuseCoefficients[1].xyz*eN.y;eQ+=uDiffuseCoefficients[2].xyz*eN.z;eQ+=uDiffuseCoefficients[3].xyz*eN.x;vec3 swz=eN.yyz*eN.xzx;eR=uDiffuseCoefficients[4].xyz*swz.x;eR+=uDiffuseCoefficients[5].xyz*swz.y;eR+=uDiffuseCoefficients[7].xyz*swz.z;vec3 sqr=eN*eN;eR+=uDiffuseCoefficients[6].xyz*(3.0*sqr.z-1.0);eR+=uDiffuseCoefficients[8].xyz*(sqr.x-sqr.y);}vec3 eS(vec3 eP,vec3 eQ,vec3 eR,vec3 eT,float eu){eT=mix(vec3(1.0),eT,eu);return(eP+eQ*eT.x)+eR*eT.z;}vec3 eU(vec3 eP,vec3 eQ,vec3 eR,vec3 eT,vec3 eV){vec3 eW=mix(vec3(1.0),eT.yyy,eV);vec3 eX=mix(vec3(1.0),eT.zzz,eV);return(eP+eQ*eW)+eR*eX;}vec3 dB(vec3 eN,float V){eN/=dot(vec3(1.0),abs(eN));vec2 eY=abs(eN.zx)-vec2(1.0,1.0);vec2 eZ=vec2(eN.x<0.0?eY.x:-eY.x,eN.z<0.0?eY.y:-eY.y);vec2 fc=(eN.y<0.0)?eZ:eN.xz;fc=vec2(0.5*(254.0/256.0),0.125*0.5*(254.0/256.0))*fc+vec2(0.5,0.125*0.5);float fd=fract(7.0*V);fc.y+=0.125*(7.0*V-fd);vec2 fe=fc+vec2(0.0,0.125);vec4 ff=mix(texture2D(tSkySpecular,fc),texture2D(tSkySpecular,fe),fd);vec3 r=ff.xyz*(7.0*ff.w);return r*r;}float dC(vec3 eN,vec3 fh){float fi=dot(eN,fh);fi=saturate(1.0+uHorizonOcclude*fi);return fi*fi;}",

        "matmicrofiber.glsl": "\n#ifdef MICROFIBER\nuniform vec4 uTexRangeFuzz;uniform float uFresnelIntegral;uniform vec4 uFresnelColor;uniform float uFresnelOcc;uniform float uFresnelGlossMask;struct dj{vec3 dm;vec3 dT;vec3 fj;vec3 fk;vec3 fl;};void dl(out dj s,vec3 N){s.dm=s.dT=du(N);s.fj=vec3(0.0);s.fk=uFresnelColor.rgb;s.fl=uFresnelColor.aaa*vec3(1.0,0.5,0.25);\n#ifndef MICROFIBER_NO_FUZZ_TEX\nvec4 J=R(j,uTexRangeFuzz);s.fk*=L(J.rgb);\n#endif\n}void dS(inout dj s,float fm,vec3 dN,vec3 N,vec3 dP){float en=dot(dN,N);float dT=saturate((1.0/3.1415926)*en);float fn=eD(en,s.fl.z);\n#ifdef SHADOW_COUNT\ndT*=fm;float fo=mix(1.0,fm,uFresnelOcc);float fj=fn*fo;\n#else \nfloat fj=fn;\n#endif\ns.fj=fj*dP+s.fj;s.dT=dT*dP+s.dT;}void dX(out vec3 dn,out vec3 diff_extra,inout dj s,vec3 T,vec3 N,float V){s.fj*=uFresnelIntegral;float eL=dot(T,N);vec2 fu=eK(vec2(eL,eL),s.fl.xy);s.fj=s.dm*fu.x+(s.fj*fu.y);s.fj*=s.fk;float fv=saturate(1.0+-uFresnelGlossMask*V);s.fj*=fv*fv;dn=s.dT;diff_extra=s.fj;}\n#endif\n",

        "matsampling.glsl": "vec3 L(vec3 c){return c*c;}vec3 O(vec3 n){vec3 fA=E;vec3 fB=F;vec3 fC=gl_FrontFacing?G:-G;\n#ifdef TSPACE_RENORMALIZE\nfC=normalize(fC);\n#endif\n#ifdef TSPACE_ORTHOGONALIZE\nfA-=dot(fA,fC)*fC;\n#endif\n#ifdef TSPACE_RENORMALIZE\nfA=normalize(fA);\n#endif\n#ifdef TSPACE_ORTHOGONALIZE\nfB=(fB-dot(fB,fC)*fC)-dot(fB,fA)*fA;\n#endif\n#ifdef TSPACE_RENORMALIZE\nfB=normalize(fB);\n#endif\n#ifdef TSPACE_COMPUTE_BITANGENT\nvec3 fD=cross(fC,fA);fB=dot(fD,fB)<0.0?-fD:fD;\n#endif\nn=2.0*n-vec3(1.0);return normalize(fA*n.x+fB*n.y+fC*n.z);}vec3 Q(vec3 t){vec3 fC=gl_FrontFacing?G:-G;return normalize(E*t.x+F*t.y+fC*t.z);}vec4 R(vec2 fE,vec4 fF){\n#if GL_OES_standard_derivatives\nvec2 fG=fract(fE);vec2 fH=fwidth(fG);float fI=(fH.x+fH.y)>0.5?-6.0:0.0;return texture2D(tExtras,fG*fF.xy+fF.zw,fI);\n#else\nreturn texture2D(tExtras,fract(fE)*fF.xy+fF.zw);\n#endif\n}vec3 fJ(sampler2D fK,vec2 fL,float fM){vec3 n=texture2D(fK,fL,fM*2.5).xyz;return O(n);}",

        "matshadows.glsl": "\n#ifdef SHADOW_COUNT\n" +
        "#ifdef MOBILE\n" +
        "#define SHADOW_KERNEL (4.0/1536.0)\n#" +
        "else\n#define SHADOW_KERNEL (4.0/2048.0)\n" +
        "#endif\n" +
        "highp vec4 m(highp mat4 o,highp vec3 p){return o[0]*p.x+(o[1]*p.y+(o[2]*p.z+o[3]));}" +
        "uniform sampler2D tDepth0;\n" +
        "#if SHADOW_COUNT > 1\n" +
        "uniform sampler2D tDepth1;" +
        "\n#if SHADOW_COUNT > 2\n" +
        "uniform sampler2D tDepth2;\n" +
        "#endif\n" +
        "#endif\n" +
        "uniform highp vec2 uShadowKernelRotation;" +
        "uniform highp vec4 uShadowMapSize;" +
        "uniform highp mat4 uShadowMatrices[SHADOW_COUNT];" +
        "uniform highp mat4 uInvShadowMatrices[SHADOW_COUNT];" +
        "uniform highp vec4 uShadowTexelPadProjections[SHADOW_COUNT];" +

        "highp float fN(highp vec3 C){return(C.x+C.y*(1.0/255.0))+C.z*(1.0/65025.0);}" +

        "float fO(sampler2D fP,highp vec2 fE,highp float fQ){" +
        "\n#ifndef MOBILE\nhighp vec2 c=fE*uShadowMapSize.xy;" +
        "highp vec2 a=floor(c)*uShadowMapSize.zw,b=ceil(c)*uShadowMapSize.zw;" +
        "highp vec4 dK;" +
        "dK.x=fN(texture2D(fP,a).xyz);" +
        "dK.y=fN(texture2D(fP,vec2(b.x,a.y)).xyz);" +
        "dK.z=fN(texture2D(fP,vec2(a.x,b.y)).xyz);" +
        "dK.w=fN(texture2D(fP,b).xyz);" +
        "highp vec4 fR;" +
        "fR.x=fQ<dK.x?1.0:0.0;" +
        "fR.y=fQ<dK.y?1.0:0.0;" +
        "fR.z=fQ<dK.z?1.0:0.0;" +
        "fR.w=fQ<dK.w?1.0:0.0;" +
        "highp vec2 w=c-a*uShadowMapSize.xy;" +
        "vec2 s=(w.y*fR.zw+fR.xy)-w.y*fR.xy;" +
        "return(w.x*s.y+s.x)-w.x*s.x;" +
        "\n#else\n" +
        "highp float C=fN(texture2D(fP,fE.xy).xyz);" +
        "return fQ<C?1.0:0.0;" +
        "\n#endif\n}" +

        "highp float fS(sampler2D fP,highp vec3 fE,float fT){" +
        "highp vec2 v=uShadowKernelRotation*fT;" +
        "float s;" +
        "s=fO(fP,fE.xy+v,fE.z);" +
        "s+=fO(fP,fE.xy-v,fE.z);" +
        "s+=fO(fP,fE.xy+vec2(-v.y,v.x),fE.z);" +
        "s+=fO(fP,fE.xy+vec2(v.y,-v.x),fE.z);" +
        "s*=0.25;return s*s;}" +
        "struct dF{float dR[LIGHT_COUNT];};" +

       "void dH(out dF ss,float fT){" +
        "highp vec3 fU[SHADOW_COUNT];" +
        "vec3 fC=gl_FrontFacing?G:-G;" +
        "for(int u=0;u<SHADOW_COUNT;++u){" +
        "vec4 fV=uShadowTexelPadProjections[u];" +
        "float fW=fV.x*D.x+(fV.y*D.y+(fV.z*D.z+fV.w));" +
        "\n#ifdef MOBILE\nfW*=.001+fT;\n#else\nfW*=.0005+0.5*fT;\n#endif\n" +
        "highp vec4 fX=m(uShadowMatrices[u],D+fW*fC);" +
        "fU[u]=fX.xyz/fX.w;}" +
        "float J;\n#if SHADOW_COUNT > 0\n" +
        "J=fS(tDepth0,fU[0],fT);" +
        "ss.dR[0]=J;\n#endif\n#if SHADOW_COUNT > 1\n" +
        "J=fS(tDepth1,fU[1],fT);" +
        "ss.dR[1]=J;\n#endif\n#if SHADOW_COUNT > 2\n" +
        "J=fS(tDepth2,fU[2],fT);ss.dR[2]=J;\n#endif\n" +
        "for(int u=SHADOW_COUNT;u<LIGHT_COUNT;++u){" +
        "ss.dR[u]=1.0;" +
        "}}" +
        "struct dJ{highp float dK[LIGHT_COUNT];};" +

        "highp vec4 fY(sampler2D fP,highp vec2 fE,highp mat4 fZ){" +
        "highp vec4 hc;hc.xy=fE;\n#ifndef MOBILE\nhighp vec2 c=fE*uShadowMapSize.xy;" +
        "highp vec2 a=floor(c)*uShadowMapSize.zw,b=ceil(c)*uShadowMapSize.zw;" +
        "highp vec4 fR;fR.x=fN(texture2D(fP,a).xyz);" +
        "fR.y=fN(texture2D(fP,vec2(b.x,a.y)).xyz);" +
        "fR.z=fN(texture2D(fP,vec2(a.x,b.y)).xyz);" +
        "fR.w=fN(texture2D(fP,b).xyz);" +
        "highp vec2 w=c-a*uShadowMapSize.xy;" +
        "vec2 s=(w.y*fR.zw+fR.xy)-w.y*fR.xy;" +
        "hc.z=(w.x*s.y+s.x)-w.x*s.x;" +
        "\n#else \n" +
        "hc.z=fN(texture2D(fP,fE.xy).xyz);" +
        "\n#endif\nhc=m(fZ,hc.xyz);" +
        "hc.xyz/=hc.w;return hc;}" +

        "void dM(out dJ ss,float fT){" +
        "highp vec3 hd[SHADOW_COUNT];" +
        "vec3 fC=gl_FrontFacing?G:-G;" +
        "fC*=0.6;for(int u=0;u<SHADOW_COUNT;++u){" +
        "vec4 fV=uShadowTexelPadProjections[u];" +
        "float fW=fV.x*D.x+(fV.y*D.y+(fV.z*D.z+fV.w));" +
        "\n#ifdef MOBILE\nfW*=.001+fT;\n#else\nfW*=.0005+0.5*fT;\n#endif\n" +
        "highp vec4 fX=m(uShadowMatrices[u],D-fW*fC);hd[u]=fX.xyz/fX.w;}" +
        "highp vec4 he;\n#if SHADOW_COUNT > 0\n" +
        "he=fY(tDepth0,hd[0].xy,uInvShadowMatrices[0]);" +
        "ss.dK[0]=length(D.xyz-he.xyz);\n#endif\n#if SHADOW_COUNT > 1\n" +
        "he=fY(tDepth1,hd[1].xy,uInvShadowMatrices[1]);" +
        "ss.dK[1]=length(D.xyz-he.xyz);\n#endif\n#if SHADOW_COUNT > 2\n" +
        "he=fY(tDepth2,hd[2].xy,uInvShadowMatrices[2]);ss.dK[2]=length(D.xyz-he.xyz);\n#endif\n" +
        "for(int u=SHADOW_COUNT;u<LIGHT_COUNT;++u){ss.dK[u]=1.0;}}\n#endif\n",

        "matskin.glsl": "\n#ifdef SKIN\nuniform vec4 uTexRangeSubdermis;uniform vec4 uTexRangeTranslucency;uniform vec4 uTexRangeFuzz;uniform vec3 uSubdermisColor;uniform vec4 uTransColor;uniform float uTransScatter;uniform vec4 uFresnelColor;uniform float uFresnelOcc;uniform float uFresnelGlossMask;uniform float uTransSky;uniform float uFresnelIntegral;uniform float uTransIntegral;uniform float uSkinTransDepth;uniform float uSkinShadowBlur;uniform float uNormalSmooth;struct de{vec3 hf;vec3 hh,hi,hj,fj;vec3 di,dm,hk;vec3 hl;vec3 hm;vec3 hn;vec3 ho;float hu;float hv;float hA;float dI;};void dh(out de s){vec4 J;\n#ifdef SKIN_NO_SUBDERMIS_TEX\ns.hf=uSubdermisColor;s.hA=1.0;\n#else \nJ=R(j,uTexRangeSubdermis);s.hf=L(J.xyz);s.hA=J.w*J.w;\n#endif\ns.ho=uTransColor.rgb;s.hu=uTransScatter;\n#ifdef SKIN_VERSION_1\ns.dI=uSkinShadowBlur*s.hA;\n#else \ns.hv=max(max(s.ho.r,s.ho.g),s.ho.b)*uTransColor.a;float hB=max(s.hf.r,max(s.hf.g,s.hf.b));hB=1.0-hB;hB*=hB;hB*=hB;hB*=hB;hB=1.0-(hB*hB);s.hA*=hB;s.dI=uSkinShadowBlur*s.hA*dot(s.hf.rgb,vec3(0.333,0.334,0.333));\n#endif\n#ifndef SKIN_NO_TRANSLUCENCY_TEX\nJ=R(j,uTexRangeTranslucency);s.ho*=L(J.xyz);\n#endif\ns.hl=fJ(tNormal,j,uNormalSmooth*s.hA);vec3 hC,hD,hE;eO(hC,hD,hE,s.hl);s.dm=s.hh=hC+hD+hE;\n#ifdef SKIN_VERSION_1 \ns.di=eU(hC,hD,hE,vec3(1.0,0.6667,0.25),s.hf);\n#else\ns.di=eU(hC,hD,hE,vec3(1.0,0.6667,0.25),s.hf*0.2+vec3(0.1));\n#endif\n#ifdef SKIN_VERSION_1\nvec3 hF,hG,hH;eO(hF,hG,hH,-s.hl);s.hk=eS(hF,hG,hH,vec3(1.0,0.4444,0.0625),s.hu);s.hk*=uTransSky;\n#else \ns.hk=vec3(0.0);\n#endif\ns.hi=s.hj=s.fj=vec3(0.0);s.hf*=0.5;s.hu*=0.5;s.hm=uFresnelColor.rgb;s.hn=uFresnelColor.aaa*vec3(1.0,0.5,0.25);\n#ifndef SKIN_NO_FUZZ_TEX\nJ=R(j,uTexRangeFuzz);s.hm*=L(J.rgb);\n#endif\n}void dQ(inout de s,float hI,float hJ,vec3 dN,vec3 N,vec3 dP){float en=dot(dN,N);float eo=dot(dN,s.hl);float dT=saturate((1.0/3.1415926)*en);float fm=hI*hI;fm*=fm;fm=saturate(6.0*fm);\n#ifdef SKIN_VERSION_1 \nvec3 hK=eE(eo,s.hf);\n#else \nvec3 hK=em(en,eo,s.hf);\n#endif\nfloat hL=eD(-eo,s.hu);vec3 hj=vec3(hL*hL);\n#ifdef SKIN_VERSION_1\n#ifdef SHADOW_COUNT\nvec3 hM=vec3(hI);float hN=saturate(fm-2.0*(hI*hI));hM+=hN*s.hf;float hO=hI;\n#endif\n#else\n#ifdef SHADOW_COUNT\nvec3 hM;highp vec3 hP=(0.995*s.hf)+vec3(0.005,0.005,0.005);highp vec3 hQ=vec3(1.0)-hP;hP=mix(hP,hQ,hI);float hR=sqrt(hI);vec3 hS=2.0*vec3(1.0-hR);hR=1.0-hR;hR=(1.0-hR*hR);hM=saturate(pow(hP*hR,hS));highp float hT=0.35/(uSkinTransDepth+0.001);highp float hU=saturate(hJ*hT);hU=saturate(1.0-hU);hU*=hU;highp vec3 hV=vec3((-3.0*hU)+3.15);highp vec3 hW=(0.9975*s.ho)+vec3(0.0025,0.0025,0.0025);highp float hB=saturate(10.0*dot(hW,hW));vec3 hO=pow(hW*hU,hV)*hB;\n#else \nhj=vec3(0.0);\n#endif\n#endif\nfloat fn=eD(eo,s.hn.z);\n#ifdef SHADOW_COUNT\nvec3 fo=mix(vec3(1.0),hM,uFresnelOcc);vec3 fj=fn*fo;\n#else\nvec3 fj=vec3(fn);\n#endif\n#ifdef SHADOW_COUNT\nhK*=hM;dT*=fm;hj*=hO;\n#endif\ns.fj=fj*dP+s.fj;s.hj=hj*dP+s.hj;s.hi=hK*dP+s.hi;s.hh=dT*dP+s.hh;}void dW(out vec3 dn,out vec3 diff_extra,inout de s,vec3 T,vec3 N,float V){s.fj*=uFresnelIntegral;float eL=dot(T,N);vec2 fu=eK(vec2(eL,eL),s.hn.xy);s.fj=s.dm*fu.x+(s.fj*fu.y);s.fj*=s.hm;float fv=saturate(1.0+-uFresnelGlossMask*V);s.fj*=fv*fv;s.hj=s.hj*uTransIntegral;\n#ifdef SKIN_VERSION_1\ns.hi=(s.hi*eG(s.hf))+s.di;\n#else\ns.hi=(s.hi*eC(s.hf))+s.di;\n#endif\ndn=mix(s.hh,s.hi,s.hA);\n#ifdef SKIN_VERSION_1\ns.hj=(s.hj+s.hk)*s.ho;diff_extra=(s.fj+s.hj)*s.hA;\n#else\ndn+=s.hj*s.hv;diff_extra=s.fj*s.hA;\n#endif\n}\n#endif\n",

        "matstrips.glsl": "\n#ifdef STRIPVIEW\nuniform float uStrips[5];uniform vec2 uStripRes;struct Y{float hB[5];float bg;};void dc(out Y hX,inout float V,inout vec3 U){highp vec2 fE=gl_FragCoord.xy*uStripRes-vec2(1.0,1.0);fE.x+=0.25*fE.y;hX.hB[0]=step(fE.x,uStrips[0]);hX.hB[1]=step(fE.x,uStrips[1]);hX.hB[2]=step(fE.x,uStrips[2]);hX.hB[3]=step(fE.x,uStrips[3]);hX.hB[4]=step(fE.x,uStrips[4]);hX.bg=1.0-hX.hB[4];hX.hB[4]-=hX.hB[3];hX.hB[3]-=hX.hB[2];hX.hB[2]-=hX.hB[1];hX.hB[1]-=hX.hB[0];bool hY=hX.hB[4]>0.0;V=hY?0.5:V;U=hY?vec3(0.1):U;}vec3 ec(Y hX,vec3 N,vec3 K,vec3 U,float V,vec3 dn,vec3 dA,vec3 hZ){return hX.hB[0]*(N*0.5+vec3(0.5))+hX.hB[1]*K+hX.hB[2]*U+vec3(hX.hB[3]*V)+hX.hB[4]*(vec3(0.12)+0.3*dn+dA)+hX.bg*hZ;}\n#endif\n",

        "matvert.glsl": "precision highp float;uniform mat4 uModelViewProjectionMatrix;uniform mat4 uSkyMatrix;attribute vec3 vPosition;attribute vec2 vTexCoord;attribute vec2 vTangent;attribute vec2 vBitangent;attribute vec2 vNormal;\n#ifdef VERTEX_COLOR\nattribute vec4 vColor;\n#endif\n#ifdef TEXCOORD_SECONDARY\nattribute vec2 vTexCoord2;\n#endif\nvarying highp vec3 D;varying mediump vec2 j;varying mediump vec3 E;varying mediump vec3 F;varying mediump vec3 G;\n#ifdef VERTEX_COLOR\nvarying lowp vec4 H;\n#endif\n#ifdef TEXCOORD_SECONDARY\nvarying mediump vec2 I;\n#endif\nvec3 ic(vec2 id){bool ie=(id.y>(32767.1/65535.0));id.y=ie?(id.y-(32768.0/65535.0)):id.y;vec3 r;r.xy=(2.0*65535.0/32767.0)*id-vec2(1.0);r.z=sqrt(clamp(1.0-dot(r.xy,r.xy),0.0,1.0));r.z=ie?-r.z:r.z;return r;}vec4 m(mat4 o,vec3 p){return o[0]*p.x+(o[1]*p.y+(o[2]*p.z+o[3]));}vec3 ih(mat4 o,vec3 id){return o[0].xyz*id.x+o[1].xyz*id.y+o[2].xyz*id.z;}void main(void){gl_Position=m(uModelViewProjectionMatrix,vPosition.xyz);j=vTexCoord;E=ih(uSkyMatrix,ic(vTangent));F=ih(uSkyMatrix,ic(vBitangent));G=ih(uSkyMatrix,ic(vNormal));D=m(uSkyMatrix,vPosition.xyz).xyz;\n#ifdef VERTEX_COLOR\nH=vColor;\n#endif\n#ifdef TEXCOORD_SECONDARY\nI=vTexCoord2;\n#endif\n}",
        //decocde     
        //"postfrag.glsl": "precision mediump float;uniform sampler2D tInput;\n#ifdef BLOOM\nuniform sampler2D tBloom;\n#endif\n#ifdef GRAIN\nuniform sampler2D tGrain;\n#endif\n#ifdef COLOR_LUT\nuniform sampler2D tLUT;\n#endif\nuniform vec3 uScale;uniform vec3 uBias;uniform vec3 uSaturation;uniform vec4 uSharpenKernel;uniform vec3 uSharpness;uniform vec3 uBloomColor;uniform vec4 uVignetteAspect;uniform vec4 uVignette;uniform vec4 uGrainCoord;uniform vec2 uGrainScaleBias;varying vec2 vUv;vec3 toneMap(vec3 c){vec3 sqrtc =sqrt(c);return(sqrtc -sqrtc *c)+c*(0.4672*c+vec3(0.5328));}void main(void){vec4 inputColor=texture2D(tInput,vUv);vec3 col=inputColor.xyz;\n#ifdef SHARPEN\nvec3 sharp=texture2D(tInput,vUv+uSharpenKernel.xy).xyz;sharp+=texture2D(tInput,vUv-uSharpenKernel.xy).xyz;sharp+=texture2D(tInput,vUv+uSharpenKernel.zw).xyz;sharp+=texture2D(tInput,vUv-uSharpenKernel.zw).xyz;vec3 sharpColor=uSharpness.x*col-uSharpness.y*sharp;col+=clamp(sharpColor,-uSharpness.z,uSharpness.z);\n#endif\n#ifdef BLOOM\ncol+=uBloomColor*texture2D(tBloom,vUv).xyz;\n#endif\n#ifdef VIGNETTE\nvec2 vi=vUv*uVignetteAspect.xy-uVignetteAspect.zw;vec3 vignette=clamp(vec3(1.0,1.0,1.0)-uVignette.xyz*dot(vi,vi),0.0,1.0);vec3 pow3=vignette*vignette*vignette;col*=mix(id,pow3,uVignette.w);\n#endif\n#ifdef SATURATION\nfloat gray=dot(c,vec3(0.3,0.59,0.11));col=mix(vec3(gray,gray,gray),col,uSaturation);\n#endif\n#ifdef CONTRAST\ncol=col*uScale+uBias;\n#endif\n#ifdef GRAIN\nfloat grain=uGrainScaleBias.x*texture2D(tGrain,vUv*uGrainCoord.xy+uGrainCoord.zw).x+uGrainScaleBias.y;col+=col*grain;\n#endif\n#ifdef REINHARD\n{col*=1.8;float grayColor=dot(col,vec3(0.3333));col=clamp(col/(1.0+grayColor),0.0,1.0);}\n#elif defined(HEJL)\n{const highp float A=0.22,B=0.3,C=.1,D=0.2,E=.01,F=0.3;const highp float G=1.25;highp vec3 xx=max(vec3(0.0),col-vec3(.004));col=(xx*(A*xx+C*B)+D*E)/(xx*(A*xx+B)+D*F)-E/F;col *=G;}\n#endif\n#ifdef COLOR_LUT\ncol=clamp(col,0.0,1.0);col=(255.0/256.0)*col+vec3(0.5/256.0);col.x=texture2D(tLUT,col.xx).x;col.y=texture2D(tLUT,col.yy).y;col.z=texture2D(tLUT,col.zz).z;col*=col;\n#endif\ngl_FragColor.xyz=toneMap(col);gl_FragColor.w=inputColor.w;}",
        //decocde     
        "postvert.glsl": "precision highp float;attribute vec2 vCoord;varying vec2 d;varying vec2 vUv;void main(void){d=vCoord;vUv=vCoord;gl_Position.xy=2.0*vCoord-vec2(1.0,1.0);gl_Position.zw=vec2(0.0,1.0);}",
        //decocde     
        "shadowfrag.glsl": "precision highp float;varying vec2 zw;\n#ifdef ALPHA_TEST\nvarying mediump vec2 vUv;uniform sampler2D tAlbedo;\n#endif\nvec3 encode(float floatValue){vec4 encode=vec4(1.0,255.0,65025.0,16581375.0)*floatValue;encode=fract(encode);encode.xyz-=encode.yzw*(1.0/255.0);return encode.xyz;}void main(void){\n#ifdef ALPHA_TEST\nfloat alpha=texture2D(tAlbedo,vUv).a;if(alpha<0.5){discard;}\n#endif\ngl_FragColor.xyz=encode((zw.x/zw.y)*0.5+0.5);gl_FragColor.w=0.0;}",
        //decocde     
        "shadowvert.glsl": "precision highp float;attribute vec3 vPosition;attribute vec2 vTexCoord;uniform mat4 uViewProjection;varying vec2 zw;\n#ifdef ALPHA_TEST\nvarying mediump vec2 vUv;\n#endif\nvec4 mul(mat4 m,vec3 v){return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];}void main(void){gl_Position=mul(uViewProjection,vPosition);zw=gl_Position.zw;\n#ifdef ALPHA_TEST\nvUv=vTexCoord;\n#endif\n}",
        //decocde     
        "sky.glsl": "precision highp float;uniform sampler2D tSkyTexture;uniform float uAlpha;varying vec2 vUv;void main(void){vec3 col=texture2D(tSkyTexture,vUv).xyz;gl_FragColor.xyz=col*col;gl_FragColor.w=uAlpha;}",
        //decocde     
        "skySH.glsl": "precision mediump float;uniform vec4 uSkyCoefficients[9];uniform float uAlpha;varying vec3 vPos;void main(void){vec3 dir=normalize(vPos);vec3 col=uSkyCoefficients[0].xyz;col+=uSkyCoefficients[1].xyz*dir.y;col+=uSkyCoefficients[2].xyz*dir.z;col+=uSkyCoefficients[3].xyz*dir.x;vec3 dir2=dir.yyz*dir.xzx;col+=uSkyCoefficients[4].xyz*dir2.x;col+=uSkyCoefficients[5].xyz*dir2.y;col+=uSkyCoefficients[7].xyz*dir2.z;vec3 dir3=dir*dir;col+=uSkyCoefficients[6].xyz*(3.0*dir3.z-1.0);col+=uSkyCoefficients[8].xyz*(dir3.x-dir3.y);gl_FragColor.xyz=col;gl_FragColor.w=uAlpha;}",
        //decocde     
        "skyvert.glsl": "precision highp float;uniform mat4 uInverseSkyMatrix;uniform mat4 uViewProjection;attribute vec3 vPosition;attribute vec2 vTexCoord;\n#if SKYMODE == 3\nvarying vec3 vPos;\n#else\nvarying vec2 vUv;\n#endif\nvec4 mul(mat4 m,vec3 v){return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];}vec4 mul3(mat4 m,vec3 v){return m[0]*v.x+m[1]*v.y+m[2]*v.z;}void main(void){vec3 p=mul(uInverseSkyMatrix,vPosition).xyz;gl_Position=mul3(uViewProjection,p);gl_Position.z-=(1.0/65535.0)*gl_Position.w;\n#if SKYMODE == 3\nvPos=vPosition;vPos.xy+=1e-20*vTexCoord;\n#else\nvUv=vTexCoord;\n#endif\n}",
        //decocde     
        "wirefrag.glsl": "precision highp float;uniform vec4 uStripParams;void main(void){vec2 uv=gl_FragCoord.xy*uStripParams.xy-vec2(1.0,1.0);uv.x+=0.25*uv.y;float alpha=uv.x<uStripParams.z?0.0:0.9;alpha=uv.x<uStripParams.w?alpha:0.0;gl_FragColor=vec4(0.0,0.0,0.0,alpha);}",
        //decocde     
        "wirevert.glsl": "precision highp float;uniform mat4 uModelViewProjectionMatrix;attribute vec3 vPosition;vec4 mul(mat4 m,vec3 v){return m[0]*v.x+m[1]*v.y+m[2]*v.z+m[3];}void main(void){gl_Position=mul(uModelViewProjectionMatrix,vPosition);gl_Position.z+=-0.00005*gl_Position.w;}",
        nil: ""
    };
})(marmoset);
