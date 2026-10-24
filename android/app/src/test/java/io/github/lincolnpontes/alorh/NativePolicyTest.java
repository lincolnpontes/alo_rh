package io.github.lincolnpontes.alorh;
import org.junit.Test;
import static org.junit.Assert.*;
public class NativePolicyTest {
    @Test public void packagedOriginOnly(){
        assertTrue(NativePolicy.internal("https://appassets.androidplatform.net/assets/index.html?v=1.4.0"));
        for(String url:new String[]{"http://appassets.androidplatform.net/assets/index.html","https://appassets.androidplatform.net.evil.test/assets/index.html","https://evil@appassets.androidplatform.net/assets/index.html","https://appassets.androidplatform.net:444/assets/index.html","https://appassets.androidplatform.net/assets/%2e%2e/config","file:///assets/index.html","javascript:alert(1)"})assertFalse(url,NativePolicy.internal(url));
    }
    @Test public void externalLinksNeverEnterTheWebview(){
        assertTrue(NativePolicy.external("https://wa.me/5583000000000"));
        for(String url:new String[]{"javascript:alert(1)","intent://evil","http://wa.me/123","file:///etc/passwd","https://user:password@wa.me","https://appassets.androidplatform.net/assets/index.html"})assertFalse(url,NativePolicy.external(url));
    }
    @Test public void filenamesCannotAddressDirectories(){
        assertEquals(".._.._secret.json",NativePolicy.filename("../../secret.json"));
        assertEquals("arquivo-alorh",NativePolicy.filename(".."));
        assertEquals(120,NativePolicy.filename("a".repeat(150)).length());
    }
}
