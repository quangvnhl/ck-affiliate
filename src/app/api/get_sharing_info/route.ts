"use server";

import { NextRequest, NextResponse } from "next/server";

// Full headers from Shopee app with authentication tokens
const SHOPEE_HEADERS: Record<string, string> = {
    "Accept": "*/*",
    "af-ac-enc-sz-token": "MBDgk/6DllcxbuHnbfNCUw==|j42txkZRUqmZBFbfsrBsPkjsFw19MkjUSQA/SxcSPZ/Kj9cDRjY5awzfTcyxsmbQ7EngDWvWFiSTgbXunc1yDwNo|kGzKecUa8t0oRtmp|08|2",
    "Accept-Language": "vi-VN,vi,fr-FR,fr,en-US,en",
    "x-api-source": "rn",
    "User-Agent": "iOS app iPhone Shopee appver=36649 language=vi app_type=1 platform=native_ios os_ver=26.0.1 Cronet/102.0.5005.61",
    "5bbab827": "jIpXGoxgIcL/NEY5B3u2oWPTvLr0wX3KSCoOiF5OTsDqroLq9sQxejskfIfVWgTHdQOg2XfoZDzQm3MCP2rwN+5Q65KEnn/mOXExkY1sr4yJxA2xpC7fJbuCTN+gzAwk0LteTRu9JWil9JDkLXJu+tjFweeGOmYK1rDeJYoPhF26w2SCU3GiJl2YCYNEJ3lJnNGQZHcyGrjsr+sugVqBSnd83kdb4E9WGEbHG1ZY9dbU4kmUsO6u6H58lXlWlKh3QZ3fo+0DCpyZlGu9Y/ycpeCpme/dXMyy5fsZ4EPIbxelNJcP3r+iVDcneoNtn+FHpE1nQyEaeCzM0sTYegy5PyM/Oix3q8WOyfjyfg/cWe1/5clhaFxa4CbHdhfB1EHCVArFcap3ffUsFjhqWaj3FA7kuXmW6kkooGllvjVoUdh/fxBbYu3kgOaxDsrUNIUWug43PVs5diMeoCunQSzO9gkF/X1m4MHwmdmis3fSRajaHMFURKANMujkcPFIkhHZXhXSxI+8cwLrpT25vtAyYZag/dl5TMKUdaAED2+xXTLLo9aUBywYvNvqnIaa606TdKHQKXllvxncX7IAiRRLH5bS+4Yb9mx+09a7g/mw+ugZkgriGGDnCapu5PVIjMRQXEtq2ESMsvRUVMCApkzbniFXeOwbmLGf2vSUSuQe7de3ArPWOhlnDkBXmbtRJDNpYMNWdOKiwsCBFQsamWyoW/VYaSXUUUAj52rbdS5HJZcpezrdb39NI6DMTZprpY1CelwcpuyRA8Npff23//z6auzXrADHIC8H0yN+KHOYBc79BYGAPQTPiJJneaW/pchHl2eCHGOFhjz+y3vG/m4Heb7jtI6trIAshZoknClkcLU5Ixx3/Rz5U3CFW5/044d5/ZFNEfbOHhn+TC8iuy6zg75SVK7z6Eroo9RspjQvRKPBvQ5qAGkX0XpiceiP04TQFFaeduse4YW3LnO/j/0i/rg3V+9rUXW9nTTUSla8cq86eE8Y2js1SekPgwQ7ID1WWiZIm5aATudOjuMk",
    "Referer": "https://mall.shopee.vn/",
    "Accept-Encoding": "gzip, deflate, br",
    "x-sap-ri": "ebec6d69175082e40a9cbe23014c97ba3dc3198d127c38acc479",
    "Connection": "keep-alive",
    "Client-Request-Id": "d9f2f93a-71aa-41e9-a482-2f155ab23384.1065",
    "d43474c9": "aRicRrvVp5/IwXxg615bUE88qNj=",
    "Cookie": "REC_T_ID=7274c643-ec27-11ef-9c4c-06e1657ebf70; _ga_FV78QC1144=GS2.1.s1768479694$o2$g1$t1768480524$j60$l0$h0; _gcl_au=1.1.749893264.1768479656; _fbp=fb.1.1749621671337.424792997825787977; _ga_4GPP1ZXG63=GS2.1.s1768811715$o3$g0$t1768811715$j60$l1$h391112625; _ga=GA1.1.1896758253.1749621857; _ga_VYF4T4BCNH=GS2.1.s1768576274$o10$g0$t1768576274$j60$l0$h0; SPC_SEC_SI=v1-T056Rmt1TlZBZkxBVHIzNqH1G6Lq7KiM9B+0exfHyhnOtmjfmcJdhRGeD2KVYwzhsrQiBSw5ubaqo08RMqnsYNZtDc16a2JO2Y6CvD0Qozk=; SPC_DH=EU/D5B9XyFr1nfcaeCP9/jn2tf43o0EuLuYlA5m44x3KhDtOtSAjtzMtlWtQBPLJqcnbdgAcJA==.1kmphko.e25e0b2c; SPC_F=91762F7B39544496A68BBB5A670F23B8; SPC_DID=91762F7B39544496A68BBB5A670F23B8; SPC_RNBV=6087006; language=vi; SPC_F=91762F7B39544496A68BBB5A670F23B8; SPC_RNBV=6087006; shopee_app_version=36649; shopee_rn_bundle_version=6087006; shopee_rn_version=1767772259; shopee_token=EUQcG0K3Zko/0SUL0irwIkqowMXlteYVYd9eRgqJeSiA1ImP/esTXEfAU0mYYECU5CfWvSnIC6gT5kQx0Mc3; shopid=113428211; userid=113429809; username=cukinacha; SPC_AFTID=LAT; SPC_CLIENTID=MUFFRDYxNERFMUM0sdkptjpxxhiorzjo; csrftoken=A6z5sTTZg4BBn8nlXGYPPoFG7CLWX1fP; AC_CERT_D=U2FsdGVkX18E2rpq+y/RXrZ7srK3cYbcpFp5M7oiCTp3CPqxqjL9VIOr2gFiPfzLMD6HxAwbfgl5ikEEuo4L5SXmiRuaVNKu0P2pLllyFU8/MQmWMQPh8olCvwV3v8jj2LKmF1Xt/KUH0POVrvCNr/NhrwengS69s4agBZeeNdNhKyr+JVUy9jOAF6fDlHCeDgRBZjJwXEXto7q+IhcuM6Su9BMTVpTL/SeHl/Zv4JisH36omrSzkIBT6ETd4w4SLvcxYvTrhjC1zrILQzdk5DcWFaPv5ZiD1CXlM1T9IxsO0dEM2IOzXYJeZv8GV3/rD4eJloJD/mct3CGSxzsX8kWWjjAC1wkmRKXgVwWq6CaeMS+kzyiNnZy4jj1Gc4aolK+fNG4q+9ii6wdKAr4utq2Npci1zEaMio7fhSO7oQrB3n0E7sy6oVlzFHYtjVgzb+XX9GRLw/VNhiFILYt3KEDpeC6pDFZRff23uiB8HznVL1OtPz7lhAYBmqM7TuHcbxHKRaNJBjUjps+JH7/QM1R9e9q8FC7owEB8FKUl3ZmSUqs/7H4FkIRp9zfRYjbblcY86kQPUaQP+44RL/W4GVD3S/7jrWABS/kUW35MArTS3I+aBE7VtRkrZ8+aLK+9fG4b/P421UxGG/tOOgj+5t6haMYSHWOe0hF6JP7R+Mq8WGBNGbIsEMsYc8L1Z8lZGGMVGtO41/JtFh4pK5LBsoBZW0vIfTuM+ROUpDkpo2gDNiaj8ei3y8mGv8G1UaspIB/OBVWA6DyHl6XJiyhq5b/QozZUUeU9mVNcRayoj+U1V23QI/K281D/TMn3VRZBFAt1hdx1p4nZxvmZQ9xEn0QyyYI/JOJw31RC5nLK33sRzYcCF0T7tjS9pjdQAVGwDLkIeSQwkljs8FQzgKgK4MBXS6m0hbPKp5prNmwFFUezd5wfwYVzy5QX3/OWohtuSVzwD6VHGu6JY2K/JTuQC/glEocKKRKiBAtcDOpYfGV9RjmcurtNVYxAU/V1/SyDg4UZqQUyO0oNjf6UOYTo07WRH31IPSuQksJVroPwG5P2FlyE+9xmXsmgX+5i+b++oNWFyIh48819sZ1NUMqPK1ln1zBk5O+9Q68H+LQha22mpw5efbrSTfpMu96jSM7vCADWuQpsXhw9X/EZegtvcsdehjHJ9kvybx8Tj+KpuTBLWX4E11UI3qUU7NOgghO9I2UHu0foqZfpmahPNJHgDoPwjrIDCn7YF1wwHRZOJBE1Y+TRZmTD7A5gF5kNufDV3nc0uk5SLhkkldY9hrKZBoQx5NuUmYNAMSJ4NeonWDqu/WqYsOR2Lxc0auBPT4dfCChe/spXcqEprH+q71RTRC6whtc77oNfydkLyeQMM3hR2HruDRONqxwlWmqw2HX4; SPC_B_SI=EJJTaQAAAAA2elNXRUdUVsL9BQEAAAAAMUZvS000Mjk=; SPC_R_T_IV=YzU5d1BzeXJnZWg1a0tEYg==; SPC_T_ID=rA5zeqv6OWRLH4w/JR3qVCABujp4G4JQz5oXZpyBefwQEP20vdmOSJBSfo+aFDOUKsbsx1Gqk4KvECO/ZWipO2K96PaViTnlVgUfyRxM1/emZZ/zt8G5epKFWvlO1nbb+/wAjv+B81aJIR+w/23QigYeoJ4cUnCtWjihgDv28Vg=; SPC_T_IV=YzU5d1BzeXJnZWg1a0tEYg==; SPC_SI=tpFTaQAAAABmTWFmSVpmWlb4BQEAAAAAdXlFYUJsdno=; SPC_ST=.TzIzMXllQmZmaWhFVnVTTJfg2ir5yjvWtc2zAIxVvH4jf6fIueDw3G0HcVVoyfHE3X/iFY1MgFXRQMjcY6CPCc0/q/PNl9DoBE5vozBoDC1tqe+QXuUy0HA57OxKFANUgVcvl63mlnRIkYSUlGm35pqjQltJO0ChpZq6l5YaGUkYP3EF8NdaCNFgvX4Wrhvhg6pt6Z/IkzgYRD57vSTzKIeyc40RC5L+j07VFJPiTMPt78mm/UrI3Sh1fWF+SwS5; SPC_U=113429809; SPC_EC=.R1NHYlFrck1xdnMzZUFINnSVMIAkhYX5/YiRBkC0vTAyYIWImhbPAAlQYYZcfRawH8/o+cUF294yxYlWnLh/KznlOBsMCQdPmd62C4KWd1r6fURW99LyrCXcsoO57OCaArTpjwmXin/OfETsTVVEX3edv3kX7RxGyFuXf53JthuYzEGv+z+BVCydcWfdVOP/E58Cyya1jFSuApKggYp2Nj73o3SwelK+Bsu51UmEtrWgXLMMCQhGgDHaoRSULg1y; SPC_R_T_ID=rA5zeqv6OWRLH4w/JR3qVCABujp4G4JQz5oXZpyBefwQEP20vdmOSJBSfo+aFDOUKsbsx1Gqk4KvECO/ZWipO2K96PaViTnlVgUfyRxM1/emZZ/zt8G5epKFWvlO1nbb+/wAjv+B81aJIR+w/23QigYeoJ4cUnCtWjihgDv28Vg=",
    "3cbecbcf": "5ZIAx/csCzpQ/IHD/cmTJzvoN/T=",
    "X-Shopee-Client-Timezone": "Asia/Ho_Chi_Minh",
    "if-none-match-": "55b03-f6279be0a6a6ed96c8bea45ee184e058",
    "Host": "mall.shopee.vn",
};

/**
 * GET /api/get_sharing_info?url={shopee_url}
 * Test endpoint to debug Shopee commission API response
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json(
            { error: "Missing 'url' query parameter" },
            { status: 400 }
        );
    }

    try {
        const apiUrl = `https://mall.shopee.vn/api/v4/generic_sharing/get_sharing_info?url=${encodeURIComponent(url)}`;

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: SHOPEE_HEADERS,
        });

        const data = await response.json();

        // Return the raw response for debugging
        return NextResponse.json({
            status: response.status,
            shopee_response: data,
            parsed: {
                error: data?.error,
                affiliate_status: data?.data?.affiliate_status,
                show_banner: data?.data?.sharing_banner?.show_banner,
                sections: data?.data?.sharing_banner?.sections,
                commission_text:
                    data?.data?.sharing_banner?.sections?.[0]?.content?.slice(-1)?.[0]
                        ?.text || null,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch", details: String(error) },
            { status: 500 }
        );
    }
}
