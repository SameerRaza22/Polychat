"use client"
import React from 'react';
 import Image from "next/image";
import { Button } from "@/components/ui/button";
import { signIn } from '@/lib/auth-client';
 
 const Page = () => {
   return (
     <section className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-16 md:py-32">
        <div className="flex flex-row justify-center items-center gap-x-2">
      <h1 className="text-3xl font-extrabold text-foreground">Welcome to</h1>
      <Image src={"/polylogo.svg"} alt='Logo' width={250} height={250}/>      
        </div>

        <p className="mt-2 text-lg text-muted-foreground font-semibold">
          Sign in below
        </p>

        <Button
        variant={"default"}
        className={
          "max-w-sm mt-5 w-full px-7 py-7 flex flex-row justify-center items-center cursor-pointer"
        }
        onClick={()=>signIn.social({
          provider:"github",
          callbackURL:"/"
        })}
        >
          <Image src={"/github.svg"} alt="Github" width={24} height={24}/>
          <span className="font-bold ml-2">
            Sign in with Github
          </span>

        </Button>
     </section>
   )
 }
 
 export default Page