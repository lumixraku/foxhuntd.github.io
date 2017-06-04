precision highp float;
varying vec2 vUv;
uniform float deltaT; 
uniform float resolution; 
uniform sampler2D inputTexture; 
uniform sampler2D velocity; 
uniform float epsilon;   // Advected velocity field, u_a \n\
uniform float XYFrames;   // Advected velocity field, u_a \n\

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
	zphase += 0.00000001;
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

vec4 PseudoVolumeTexture(sampler2D sampler, vec3 inPos, float xsize, float numframes)
{
	float zframe = ceil(inPos.z * numframes);
	float zphase = fract(inPos.z * numframes);

	vec2 uv = fract(inPos.xy) / xsize;

	vec2 curframe = Tile1Dto2D(xsize, zframe) / xsize;
	vec2 nextframe = Tile1Dto2D(xsize, zframe + 1.) / xsize;

	vec4 sampleA = texture2D(sampler, uv + curframe);
	vec4 sampleB = texture2D(sampler, uv + nextframe);
	return mix(sampleA, sampleB, zphase);
}

vec3 u(vec2 coord) { 
	return texture2D(velocity, coord).xyz; 
} 

void main(void) {
float numFrames = XYFrames*XYFrames;
vec4 offsetX = volumeOffsetX(vUv,resolution,XYFrames);
vec4 offsetY = volumeOffsetY(vUv,resolution,XYFrames);
vec4 offsetZ = volumeOffsetZ(vUv,XYFrames);
vec3 vel = texture2D(velocity, vUv).xyz;

vel *= deltaT*0.5;


vec3 pos = encodeVolumeCoordinates(vUv,XYFrames);
pos -= vel;

gl_FragColor = PseudoVolumeTexture(inputTexture,pos,XYFrames, numFrames)*0.99;
 

 //
//vec2 pastCoord = fract(vUv*XYFrames) - vel; 
//pastCoord = pos.xy -vel ;
//gl_FragColor = texture2D(inputTexture, vUv); 

}
