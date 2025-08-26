import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:  process.env.CLOUDINARY_API_KEY,
    api_secret:  process.env.CLOUDINARY_API_SECRET  
});


const uploadToCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;

        cloudinary.uploader.upload(localFilePath, {
            resourse_type: "auto"
        })

        // file has been uloaded
        console.log("file uploaded to cloudinary", Response.url);
        return response;
    } catch(error){
        fs.unlinkSync(localFilePath) // remove file from local uploads folder

        return null;
    }
}


export {uploadToCloudinary}