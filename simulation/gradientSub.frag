precision highp float;
varying vec2 vUv;
uniform float resolution;         // Time between steps \n\

uniform float deltaT;         // Time between steps \n\
uniform sampler2D velocity;   // Advected velocity field, u_a \n\
uniform sampler2D pressure;   // Solved pressure field \n\
uniform float epsilon;   // Advected velocity field, u_a \n\

vec4 sphere = vec4(0.0, 0.0, 0.0,1.);

float Tile2Dto1D(float xsize, vec2 idx)
{
	idx = floor(idx);
	return idx.x+idx.y* xsize;
}

vec2 Tile1Dto2D(float xsize, float idx)
{
	vec2 xyidx = vec2(0.0);
	xyidx.y = floor(idx / xsize);
	xyidx.x = idx - xsize * xyidx.y;

	return xyidx;
}

vec3 encodeVolumeCoordinates(vec2 uv,float XYFrames)
{
	float frameNumber = XYFrames*XYFrames;
	vec2 xyframe = floor(uv * XYFrames);
	vec2 xyphase = fract(uv * XYFrames);
	float zphase = Tile2Dto1D(XYFrames,xyframe)/frameNumber;
	//Precision Fix for converting back to 2d later. 0.00001
	zphase +=0.00001;
	return vec3(xyphase,zphase);
}

vec4 volumeOffsetX(vec2 uv,float resolution,float XYFrames){
	float offsetStep = 1./resolution;
	vec2 resOffset = offsetStep * vec2(1.,0.);

	vec2 frame = uv * XYFrames;
	vec2 prevCorner = floor(frame)/XYFrames;
	vec2 nextCorner = ceil(frame)/XYFrames;

	vec2 prevCOffset = prevCorner+offsetStep*0.5;
	vec2 nextCOffset = nextCorner-offsetStep*0.5;

	return vec4(max(uv-resOffset,prevCOffset),min(uv+resOffset,nextCOffset));
}

vec4 volumeOffsetY(vec2 uv,float resolution,float XYFrames){
	float offsetStep = 1./resolution;
	vec2 resOffset = offsetStep * vec2(0.,1.);

	vec2 frame = uv * XYFrames;
	vec2 prevCorner = floor(frame)/XYFrames;
	vec2 nextCorner = ceil(frame)/XYFrames;

	vec2 prevCOffset = prevCorner+offsetStep*0.5;
	vec2 nextCOffset = nextCorner-offsetStep*0.5;

	return vec4(max(uv-resOffset,prevCOffset),min(uv+resOffset,nextCOffset));
}
vec4 volumeOffsetZ(vec2 uv,float XYFrames){
	vec2 xyframe = floor(uv * XYFrames);
	vec2 xyNextframe = ceil(uv * XYFrames);
	xyNextframe=floor(xyNextframe/XYFrames);

	float zfame = Tile2Dto1D(XYFrames,xyframe);
	vec2 zP = Tile1Dto2D(XYFrames,zfame+1.);
	vec2 zM = Tile1Dto2D(XYFrames,zfame-1.);
	zP= (zP-xyframe)/XYFrames;
	zM=	(zM-xyframe)/XYFrames;

	float zMphase = clamp(max(xyframe.x,xyframe.y),0.,1.);
	float zPphase = 1.-clamp(min(xyNextframe.x,xyNextframe.y),0.,1.);

	return vec4(uv+zP*zPphase,uv+zM*zMphase);
}


float p(vec2 coord) { 
        return texture2D(pressure, fract(coord)).x; 
} 

void main(void) {
float XYFrames = 8.;
vec4 offsetX = volumeOffsetX(vUv,resolution,XYFrames);
vec4 offsetY = volumeOffsetY(vUv,resolution,XYFrames);
vec4 offsetZ = volumeOffsetZ(vUv,XYFrames);

vec3 u_a = texture2D(velocity, vUv).xyz; 

float diff_p_x = (p(offsetX.zw) - 
                    p(offsetX.xy)); 
float u_x = u_a.x - deltaT/(2.0 * epsilon ) * diff_p_x; 

float diff_p_y = (p(offsetY.zw) - 
                    p(offsetY.xy)); 
float u_y = u_a.y - deltaT/(2.0 * epsilon ) * diff_p_y; 


gl_FragColor = vec4(u_x, u_y, 0., 0.0); 


/*
vec2 u_a = texture2D(velocity, vUv).xy; 

float diff_p_x = (p(vUv + vec2(epsilon, 0.0)) - 
                    p(vUv - vec2(epsilon, 0.0))); 
float u_x = u_a.x - deltaT/(2.0  * epsilon) * diff_p_x; 

float diff_p_y = (p(vUv + vec2(0.0, epsilon)) - 
                    p(vUv - vec2(0.0, epsilon))); 
float u_y = u_a.y - deltaT/(2.0  * epsilon) * diff_p_y; 

gl_FragColor = vec4(u_x, u_y, 0.0, 0.0); 
*/

}