import{S as w,i as C,s as S,e as v,a as _,b as q,q as A,r as g,f as $,t as h,g as O,c as d,l as L,d as D,k as b,o as y,u as E,v as H}from"/static/shared/js/index-15caf0ca.js";function M(r){const t=r-1;return t*t*t+1}function x(r,{delay:t=0,duration:n=400,easing:i=M,x:o=0,y:s=0,opacity:m=0}={}){const u=getComputedStyle(r),l=+u.opacity,c=u.transform==="none"?"":u.transform,p=l*(1-m);return{delay:t,duration:n,easing:i,css:(e,a)=>`
			transform: ${c} translate(${(1-e)*o}px, ${(1-e)*s}px);
			opacity: ${l-p*a}`}}function k(r){let t,n,i;return{c(){t=v("div"),t.innerHTML=`Welcome to the about section of nothing in particular.<br/>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
      nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
      eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
      in culpa qui officia deserunt mollit anim id est laborum.`,_(t,"class","svelte-1r1pdmu")},m(o,s){q(o,t,s),i=!0},i(o){i||(A(()=>{n||(n=g(t,x,{y:-10,duration:300},!0)),n.run(1)}),i=!0)},o(o){n||(n=g(t,x,{y:-10,duration:300},!1)),n.run(0),i=!1},d(o){o&&$(t),o&&n&&n.end()}}}function N(r){let t,n,i,o=r[0]?"Close":"Open",s,m,u,l,c,p,e=r[0]&&k();return{c(){t=v("main"),n=v("div"),i=v("button"),s=h(o),m=h(" About section"),u=O(),e&&e.c(),_(i,"class","svelte-1r1pdmu"),_(n,"class","btn-container svelte-1r1pdmu"),_(t,"class","main svelte-1r1pdmu")},m(a,f){q(a,t,f),d(t,n),d(n,i),d(i,s),d(i,m),d(t,u),e&&e.m(t,null),l=!0,c||(p=L(i,"click",r[1]),c=!0)},p(a,[f]){(!l||f&1)&&o!==(o=a[0]?"Close":"Open")&&D(s,o),a[0]?e?f&1&&b(e,1):(e=k(),e.c(),b(e,1),e.m(t,null)):e&&(H(),y(e,1,1,()=>{e=null}),E())},i(a){l||(b(e),l=!0)},o(a){y(e),l=!1},d(a){a&&$(t),e&&e.d(),c=!1,p()}}}function T(r,t,n){let i=!1;return[i,()=>n(0,i=!i)]}class U extends w{constructor(t){super(),C(this,t,T,N,S,{})}}new U({target:document.querySelector("body")});
