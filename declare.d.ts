declare module 'number-into-words' {
    
    export interface Options {
        case?: 'uppercase' | 'lowercase' | 'capital';
    }
    
    declare function indianConversion(num: number|string, options: Options): string;
    declare function internationalConversion(num: number | string, options: Options): string;
    export { indianConversion, internationalConversion,Options };
}; 


declare module 'convert-rupees-into-words';

declare module 'currency-in-words' {
    declare function convert(num: number, options: {
        format?: 'intl' | 'in',
        lang?: 'en'
    }): string;

}