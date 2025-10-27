"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoginModal } from "@/components/index";

export default function Home() {
  const router = useRouter();
  return (
    <div className="bg-image flex items-center justify-center px-4">
      <div className="flex flex-col justify-center items-center space-y-10 text-center">
        {/* image */}
        <div>
          <Image
            src="/cpclogo.png"
            alt="logo"
            width={800}
            height={600}
            className="w-40 h-40 md:w-50 md:h-50"
            priority
          />
        </div>

        {/* texts */}
        <div className="mb-20 md:mb-60">
          <h1 className="font-bold text-white text-4xl sm:text-6xl md:text-8xl">
            LOST & FOUND
          </h1>

          {/* sub text */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-20 mt-4">
            <span>
              <h3 className="text-white font-semibold text-2xl sm:text-4xl">
                C A M P U S
              </h3>
            </span>
            <span>
              <h3 className="text-white font-semibold text-2xl sm:text-4xl">
                P O R T A L
              </h3>
            </span>
          </div>
        </div>

        {/* buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto items-center">
          <LoginModal />
          <Button
            className="w-full sm:w-40 h-10"
            onClick={() => router.push("/signup")}
          >
            SIGN UP
          </Button>
        </div>
      </div>
    </div>
  );
}
