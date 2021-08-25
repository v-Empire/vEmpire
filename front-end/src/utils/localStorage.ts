


export const setLocalStore = (storeName, data: any) => {

    try {
        localStorage.setItem(storeName, JSON.stringify(data))
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }

}

export const getLocalStore = (storeName) => {

    try {
        const data = localStorage.getItem(storeName);
        if (data) {
            return JSON.parse(data);
        }
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }

}
