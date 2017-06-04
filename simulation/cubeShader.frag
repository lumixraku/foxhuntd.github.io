precision highp float;
varying vec2 vUv;
varying vec3 vPos;
uniform sampler2D uSampler;
uniform mat4 mvpInverse;
uniform float time;
uniform vec3 cam;
uniform vec2 screen;

vec4 sphere = vec4(0.0, 0.0, 0.0, 1.);

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

float fractal_noise(vec3 p)
{
    float f = 0.0;
    // add animation
    p = p - vec3(1.0, 1.0, 0.0) * time * 0.1;
    p = p * 3.0;
    f += 0.50000 * noise(p); p = 2.0 * p;
	f += 0.25000 * noise(p); p = 2.0 * p;
	f += 0.12500 * noise(p); p = 2.0 * p;
	f += 0.06250 * noise(p); p = 2.0 * p;
    f += 0.03125 * noise(p);
    
    return f;
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

float density(vec3 pos, float dist)
{    
    float den = -0.2 - dist * 1.5 + 3.0 * fractal_noise(pos);
    den = clamp(den, 0.0, 1.0);
    float size = clamp( 2.0 + 0.1, 0.4, 0.8);
    float edge = 1.0 - smoothstep(size*sphere.w, sphere.w, dist);
    edge *= edge;
    den *= edge;
    return den;
}

vec3 color(float den, float dist)
{
    // add animation
    vec3 result = mix(vec3(1.0, 0.9, 0.8 + sin(time) * 0.1), 
                      vec3(0.5, 0.15, 0.1 + sin(time) * 0.1), den * den);
    
    vec3 colBot = 3.0 * vec3(1.0, 0.9, 0.5);
	vec3 colTop = 2.0 * vec3(0.5, 0.55, 0.55);
    result *= mix(colBot, colTop, min((dist+0.5)/sphere.w, 1.0));
    return result;
}

vec4 raymarching(vec3 ro, vec3 rd, float t)
{
    vec4 sum = vec4(0.0);
    vec3 pos = ro + rd * t;

    for (int i = 0; i < 30; i++) {
        float dist = length(pos - sphere.xyz);
        if ( sum.a > 0.99) break;
        
        float den = density(pos, dist);
        vec4 col = vec4(color(den, dist), den);
        col.rgb *= col.a;
        sum = sum + col*(1.0 - sum.a); 
        
        t += 0.05;
        pos = ro + rd * t;
    }
    
    sum = clamp(sum, 0.0, 1.0);
    return sum;
}

vec4 raymarching2(vec3 ro, vec3 rd, float t,float far)
{
    vec4 sum = vec4(0.0);
    vec3 pos = ro + rd * t;

    for (int i = 0; i < 30; i++) {
	     float dist = length(pos - sphere.xyz);
        if (t > far+3.   || sum.a > 0.99) break;
        
        float den = density(pos, dist);
        vec4 col = vec4(color(den, dist), den);
        col.rgb *= col.a;
        sum = sum + col*(1.0 - sum.a); 
        
        t += 0.02;
        pos = ro + rd * t;
    }
    
    sum = clamp(sum, 0.0, 1.0);
    return sum;
}

float torus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

vec3 opTwist(vec3 p) {
  float c = cos(sin(time)*10.0*p.y);
  float s = sin(sin(time)*10.0*p.y);
  mat2 m = mat2(c, -s, s, c);
  return vec3(m * p.xz, p.y);
}

float map(vec3 p) {
  vec3 c = vec3(2.0);
  vec3 q = mod(p, c) - 0.5 * c;

  return torus(opTwist(q), vec2(0.3, 0.1));
}

float trace(vec3 o, vec3 r) {
  float t = 0.0;

  for (int i=0; i<32; i++) {
    vec3 p = o + r * t;

    float d = map(p);

    t += d * 0.5;
  }

  return t;
}

vec4 calculateClipPos(){
	vec4 ndcPos;
	ndcPos.xy = (2.0 * gl_FragCoord.xy)/screen -1.0;
	ndcPos.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /(gl_DepthRange.far - gl_DepthRange.near);
	ndcPos.w = 1.0;
	vec4 clipPos = ndcPos / gl_FragCoord.w;
	return clipPos;
}           
float boxIntersection(vec3 camPos,vec3 camVec){
	vec3 localcampos = (camPos/10000.)+0.5;
	vec3 invraydir = 1.0 / normalize(-camVec);

	vec3 firstintersections = (0.0 - localcampos) * invraydir;
	vec3 secondintersections = (1.0 - localcampos) * invraydir;
	vec3 closest = min(firstintersections, secondintersections);
	vec3 furthest = max(firstintersections, secondintersections);

	float t0 = max(closest.x, max(closest.y, closest.z));
	float t1 = min(furthest.x, min(furthest.y, furthest.z));
	float planeoffset = 1.-fract( ( t0 - length(localcampos-0.5) ) * 64.0 );

	//t0 += (planeoffset /  64.0) * 1.0;
	//t0 = max(0.0, t0);
	float boxthickness = max(0.0, t1 - t0);
	return boxthickness;
}   

vec2 iBox( in vec3 ro, in vec3 rd, in mat4 txx, in mat4 txi, in vec3 rad ) 
{
	float MaxSteps = 128.;
		float PlaneAlignment = 2.;

    // convert from ray to box space
	vec3 rdd = (txx*vec4(rd,0.0)).xyz;
	vec3 roo = (txx*vec4(ro,1.0)).xyz;

	// ray-box intersection in box space
    vec3 m = 1.0/rdd;
    vec3 n = m*roo;
    vec3 k = abs(m)*rad;
	
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;

	float tN = max( max( t1.x, t1.y ), t1.z );
	float tF = min( min( t2.x, t2.y ), t2.z );

	if( tN > tF || tF < 0.0) return vec2(-1.0);

	vec3 nor = -sign(rdd)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz);

    // convert to ray space
	
	nor = (txi * vec4(nor,0.0)).xyz;
	float planeoffset = 1.-fract( ( tN - length(roo-0.5) ) * MaxSteps );

	tN += (planeoffset / MaxSteps) * PlaneAlignment;
	return vec2( tN, tF );
}    
vec2 Tile1Dto2D(float xsize, float idx)
{
	vec2 xyidx = vec2(0.0);
	xyidx.y = floor(idx / xsize);
	xyidx.x = idx - xsize * xyidx.y;

	return xyidx;
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

vec4 integrate( in vec4 sum, in float dif, in float den, in vec3 bgcol, in float t )
{
    // lighting
    vec3 lin = vec3(0.65,0.7,0.75)*1.4 + vec3(1.0, 0.6, 0.3)*dif;        
    vec4 col = vec4( mix( vec3(1.0,0.95,0.8), vec3(0.25,0.3,0.35), den ), den );
    col.xyz *= lin;
    col.xyz = mix( col.xyz, bgcol, 1.0-exp(-0.003*t*t) );
    // front to back blending    
    col.a *= 0.4;
    col.rgb *= col.a;
    return sum + col*(1.0-sum.a);
}
float mapLod(vec3 pos){
	float XYFrames = 8.;
	float numFrames = XYFrames*XYFrames;
	return PseudoVolumeTexture(uSampler, pos*0.5+0.5, XYFrames, numFrames).x;
}
vec4 raymarching3(vec3 ro, vec3 rd, float t ){
	vec4 sum = vec4(0.0);
    vec3 pos = ro + rd * t;
	vec3 bgcol = vec3(1.,1.,1.);
	vec3 sundir = normalize( vec3(-1.0,0.0,-1.0) );
    for (int i = 0; i < 64; i++) {
	    float dist = length(pos - sphere.xyz);
		if( dist>sphere.w+0.01 ||sum.a > 0.99 ) break;
		float den = mapLod(pos);
		if( den>0.01 ) {
			float dif =  clamp((den - mapLod(pos+0.3*sundir))/0.6, 0.0, 1. );
			sum = integrate( sum, dif, den, bgcol, t );
		}
		t += 0.02;
        pos = ro + rd * t;
		
    }
	

	return clamp( sum, 0.0, 1.0 );
}


void main(void) {
	vec4 clipPos = calculateClipPos();
	gl_FragColor = texture2D(uSampler, vUv);
	vec3 worldPos = (mvpInverse*clipPos).xyz;
	vec3 camVec = normalize(worldPos-cam);
	//float t = trace(worldPos, camVec);
	//gl_FragColor = gl_FragColor*vec4(abs(mvpInverse*clipPos).xyz,1);
	//float fog = 1.0 / (1.0 + t * t * 0.1);
	//vec3 fc = vec3(1.0 - fog) * vec3(0.4, 0.8, 0.9);
	float boxthickness = boxIntersection(cam,camVec);
	vec3 ro = worldPos;
	vec3 rd = camVec;
	mat4 txi =  mat4( 1.0, 0.0, 0.0, 0.0,
				 0.0, 1.0, 0.0, 0.0,
				 0.0, 0.0, 1.0, 0.0,
				 0.0, 0.0,  0.0,   1.0 );
	mat4 txx = txi;
	vec3 box = vec3(0.9,0.9,0.9) ;
	vec2 res = iBox( ro, rd, txx, txi, box);
	float dist = sphIntersect(ro, rd, sphere);
    vec4 col = vec4(0.0);
    //if (dist > 0.0) {
	//	col = raymarching3(ro, rd,dist);
        //col = raymarching(ro, rd,0.);
   // }
	if(dist>0.0){
	  	col = raymarching3(ro, rd,dist);
      
	}
	/*
	if (dist > 0.0) {
	//col = raymarching3(ro, rd,dist,0.);
       // col = raymarching3(ro, rd,0);
   }
	*/
	//gl_FragColor = vec4(texture2D(uSampler, vUv).x,0.,0.,1.);
	gl_FragColor = col;
}