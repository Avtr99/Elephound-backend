
interface GenericResponse {
    chat_response: string;
    response_code: "OK" | "ERROR" | "SEARCH_RESULT" | "CAPTURE_RESULT";
    input_text?: string;
    input_prompt?: string;
    storageunits: StorageUnit[];
}
