precision highp float;
varying vec2 vUv;
uniform vec3 camVec;
uniform vec3 cam;
uniform float time;
uniform float time2;

uniform float distance;
uniform sampler2D pressure;
uniform sampler2D curl;
uniform float XYFrames;   // Advected velocity field, u_a \n\

float hash(vec3 p)  // replace this by something better
{
    p  = fract( p*0.3183099+.1 );
	p *= 17.0;
    return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
}

float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    return mix(mix(mix( hash(p+vec3(0,0,0)), 
                        hash(p+vec3(1,0,0)),f.x),
                   mix( hash(p+vec3(0,1,0)), 
                        hash(p+vec3(1,1,0)),f.x),f.y),
               mix(mix( hash(p+vec3(0,0,1)), 
                        hash(p+vec3(1,0,1)),f.x),
                   mix( hash(p+vec3(0,1,1)), 
                        hash(p+vec3(1,1,1)),f.x),f.y),f.z);
}
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

float rand = sin(time2)*2.-1.;
	float angle =3.14/2.;
	angle *=rand;
     float c = cos(angle);                         
     float s = sin(angle);                         
     mat2 rotation = mat2(c, s, -s, c); 
	vec2 uv = vUv;
	texture2D(pressure, uv).x; 

	vec3 ro = cam;
	vec3 rd = camVec;
	float t = (sin(time*0.4)-0.5)*1.;
	vec3 p = ro+rd*distance;
	p = vec3(0.);
	vec3 volumeCoordinate=  encodeVolumeCoordinates(uv,XYFrames);

	volumeCoordinate = (volumeCoordinate-0.5)*2.;
	vec3 direction = normalize(p-volumeCoordinate);
	float distance  =  length(p-volumeCoordinate);
	float brushSize = 0.8;
	float sj = 564.;
	brushSize*=-0.5;
	distance = brushSize+distance;
	distance *=-sj;
	distance = clamp(distance,0.,1.);

	        float x = volumeCoordinate.x; 
        float y = volumeCoordinate.y; 
		float d =length(volumeCoordinate);
			float theta = atan(y,x);
x*=2.;
y*=2.;
	vec4 color1 = vec4(rotation*vec2(sin(theta),cos(theta)),0.,1.);

		vec4 color2 = vec4(     step(1.0, mod(floor((x + 1.0) / 0.2) + floor((y + 1.0) / 0.2), 2.0)),
    step(1.0, mod(floor((x + 1.0) / 0.2) + floor((y + 1.0) / 0.2), 2.0)),
    step(1.0, mod(floor((x + 1.0) / 0.2) + floor((y + 1.0) / 0.2), 2.0)),1.)*distance;
	//color1 = texture2D(curl, vUv);
	//color2 = vec4(distance);
	gl_FragColor = time*color1 + (1.-time)*color2;

}
