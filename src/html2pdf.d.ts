declare module 'html2pdf.js' {
  interface Html2PdfInstance {
    set: (opts: Record<string, unknown>) => Html2PdfInstance
    from: (el: HTMLElement | string) => Html2PdfInstance
    save: () => Promise<void>
    output: (type: string) => Promise<unknown>
    toPdf: () => Html2PdfInstance
    get: (key: string) => unknown
  }
  const html2pdf: () => Html2PdfInstance
  export default html2pdf
}
