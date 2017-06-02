precision highp float;
varying vec2 vUv;
uniform vec3 camVec;
uniform vec3 cam;
uniform float time;
uniform float distance;

vec4 sphere = vec4(0.0, 0.0, 0.0,1.);

float Tile2Dto1D(float xsize, vec2 idx)
{
	return idx.x* xsize+idx.y;
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
float sphIntersect( vec3 ro, vec3 rd, vec4 sph )
{
    vec3 oc = ro - sph.xyz;
    float b = dot( oc, rd );
    float c = dot( oc, oc ) - sph.w*sph.w;
    float h = b*b - c;
    if( h<0.0 ) return -1.0;
    h = sqrt( h );
    return -b - h;
}

void main(void) {

	vec2 uv = vUv;
	vec3 ro = cam;
	vec3 rd = camVec;
	float t = (sin(time*0.4)-0.5)*1.;
	vec3 p = ro+rd*distance;

	vec3 volumeCoordinate=  encodeVolumeCoordinates(uv,16.);

	volumeCoordinate = (volumeCoordinate-0.5)*2.;
	
	float distance  =  length(p-volumeCoordinate);
	float brushSize = 0.5;
	float sj = 564.;
	brushSize*=-0.5;
	distance = brushSize+distance;
	distance *=-sj;
	gl_FragColor = vec4(distance,0.,0.,1.);
}