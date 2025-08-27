import { asyncHandler } from "../utils/asyncHandler.js";
import{ApiError} from "../utils/ApiError.js";
import {User} from "../models/User.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAcessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validatedBeforeSave: false})

    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
  }
}



const registerUser = asyncHandler( async (req, res) => {
    
    // get user details from frintend
    // validation - not empty
    // check if user already exists: username, email
    // check from image, avatar
    // upload them to cloudinary
    // crrate user object and save to db
    // remove password and refresh token from response
    // check user creation
    // return response

  const {fullName, email, username, password} =req.body
  console.log("email", email)

  if(
    [fullName, email, username, password].some((field) => field?.trim()==="")
  ){
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if(existedUser){
    throw new ApiError(409, "User already exists with this username or email")
  }
  // console.log("req.files", req.files)


  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;

  }

  if(!avatarLocalPath ){
    throw new ApiError(400, "Avatar is required")
  }

  const avatar = await uploadToCloudinary(avatarLocalPath)
  const coverImage = await uploadToCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400, "Avatar is required")
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createduser = await User.findById(user._id).select(
    "-password -refreshToken "
  )

  if(!createduser){
    throw new ApiError(500, "Something went wrong while registering user")
  }

  return res.status(201).json(
    new ApiResponse(200, createduser, "User registered successfully")
  )

} )


const loginUser = asyncHandler( async (req, res) => {


  // req body
  // username or email
  // find user
  // check password
  // access and refresh token 
  // send cookie


  const { email, username, password } = req.body
  if(!username || !email){
    throw new ApiError(400, "Username or email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if(!user){
    throw new ApiError(404, "User not found")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const option = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, option)
  .cookie("refreshToken", refreshToken, option)
  .json(
    new ApiResponse(
      200,
      {
        user:loggedInUser, accessToken, refreshToken
      }
    )
  )


})

const logoutuser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const option = {
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", option)
  .clearCookie("refreshToken", option)
  .json(new ApiResponse(200, {}, "User logged out"))
})

export { 
  registerUser,
  loginUser,
  logoutuser
}