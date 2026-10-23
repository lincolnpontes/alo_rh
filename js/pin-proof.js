/* PBKDF2 nativo + HMAC de uso único; o verificador derivado nunca sai do aparelho. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RHPinProof=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    async function sign(pin,context,challenge,cryptoApi=globalThis.crypto){
        if(!/^\d{3,12}$/.test(pin)||!/^([a-f0-9]{2}){16,64}$/.test(challenge?.salt||'')||!(/^[a-f0-9]{64}$/).test(challenge?.nonce||'')||challenge.iterations!==120000)throw new Error('Não foi possível preparar o acesso. Tente novamente.');
        const key=await cryptoApi.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']);
        const derived=await cryptoApi.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(challenge.salt.match(/../g),x=>parseInt(x,16)),iterations:challenge.iterations},key,{name:'HMAC',hash:'SHA-256',length:256},false,['sign']);
        const message=JSON.stringify(['alorh-pin-proof-v1',context.bankId,context.profileId,context.secret,challenge.nonce]);
        const signature=await cryptoApi.subtle.sign('HMAC',derived,new TextEncoder().encode(message));
        return {challenge:challenge.nonce,proof:Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('')};
    }
    return {sign};
});
