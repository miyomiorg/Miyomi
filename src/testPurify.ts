import DOMPurify from 'dompurify';

export function testPurify() {
    const SANITIZE_CFG = {
        ADD_TAGS: ['iframe', 'style', 'div', 'details', 'summary', 'video', 'source', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'class', 'target', 'open', 'controls', 'autoplay',
            'data-callout', 'data-callout-type', 'data-container', 'colspan', 'rowspan'],
    };
    
    const html = '<iframe width="560" height="315" src="https://www.youtube.com/embed/XXXX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    
    console.log("purified:", DOMPurify.sanitize(html, SANITIZE_CFG));
}

testPurify();
