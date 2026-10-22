package egovframework.let.co.master.material.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class MaterialInfoJava8CompatibilityTest {
    @TempDir
    Path output;

    @Test
    void serviceAndItsTestsCompileAgainstJava8Apis() throws Exception {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        assertThat(compiler).as("JDK compiler required").isNotNull();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        List<String> options = new ArrayList<>(Arrays.asList(
                "-proc:none", "-encoding", "UTF-8",
                "-classpath", System.getProperty("java.class.path"), "-d", output.toString()));
        options.addAll(compiler.isSupportedOption("--release") >= 0
                ? Arrays.asList("--release", "8") : Arrays.asList("-source", "1.8", "-target", "1.8"));
        try (StandardJavaFileManager manager = compiler.getStandardFileManager(diagnostics, null, null)) {
            Iterable<? extends JavaFileObject> sources = manager.getJavaFileObjectsFromStrings(Arrays.asList(
                    "src/main/java/egovframework/let/co/master/material/service/impl/MaterialInfoServiceImpl.java",
                    "src/test/java/egovframework/let/co/master/material/service/impl/MaterialInfoServiceImplTest.java"));
            boolean success = compiler.getTask(null, manager, diagnostics, options, null, sources).call();
            assertThat(success).withFailMessage("Java 8 API compilation failed: %s", diagnostics.getDiagnostics()).isTrue();
        }
    }
}
