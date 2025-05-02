package org.example.sociallogin.contorller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class FrontendController {

    @GetMapping("/")
    public String index() {
        return "index.html";
    }
    @RequestMapping(value = "/{path:[^\\.]*}")
    public String redirect() {
        return "forward:/";
    }
}
