package io.github.lincolnpontes.alorh;

import java.net.URI;

/** Origin and payload rules are independent of Android, so they can be unit tested. */
final class NativePolicy {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static final int MAX_BYTES = 8 * 1024 * 1024;
    static boolean internal(String url) {
        try {
            URI uri = new URI(url);
            String path = uri.getPath();
            return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getUserInfo() == null && uri.getPort() == -1
                && path != null && path.startsWith("/assets/") && !path.contains("..") && !path.contains("\\");
        } catch (Exception ignored) { return false; }
    }
    static boolean external(String url) {
        try { URI uri = new URI(url);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null
                && !"appassets.androidplatform.net".equals(uri.getHost());
        } catch (Exception ignored) { return false; }
    }
    static String filename(String name) {
        String safe = name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (safe.isEmpty() || safe.equals(".") || safe.equals("..")) safe = "arquivo-alorh";
        return safe.substring(0, Math.min(120, safe.length()));
    }
}
